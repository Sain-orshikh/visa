import { createHash } from "crypto"
import type { CloudinaryCredentials } from "@/lib/types"

/**
 * Cloudinary over its REST API rather than the SDK. The SDK configures itself
 * globally, which can't safely hold a different set of credentials per request
 * — and every upload here is signed with whichever account the user chose.
 */

/** Credentials in the clear, ready to sign with. */
export interface CloudinaryConfig {
  cloudName: string
  apiKey: string
  apiSecret: string
}

/** Parses CLOUDINARY_URL — cloudinary://<key>:<secret>@<cloud_name>. */
function parseCloudinaryUrl(value: string): CloudinaryConfig | null {
  try {
    const url = new URL(value)
    const cloudName = url.hostname
    const apiKey = decodeURIComponent(url.username)
    const apiSecret = decodeURIComponent(url.password)
    if (!cloudName || !apiKey || !apiSecret) return null
    return { cloudName, apiKey, apiSecret }
  } catch {
    return null
  }
}

/** This deployment's own Cloudinary account, backing the "app" provider. */
export function envCloudinaryConfig(): CloudinaryConfig | null {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_URL } = process.env
  if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    return {
      cloudName: CLOUDINARY_CLOUD_NAME,
      apiKey: CLOUDINARY_API_KEY,
      apiSecret: CLOUDINARY_API_SECRET,
    }
  }
  return CLOUDINARY_URL ? parseCloudinaryUrl(CLOUDINARY_URL) : null
}

/**
 * Cloudinary signs a request with the sha1 of its sorted parameters plus the
 * API secret. `file`, `api_key` and `resource_type` are excluded by the spec.
 */
function sign(params: Record<string, string>, apiSecret: string): string {
  const canonical = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&")
  return createHash("sha1").update(`${canonical}${apiSecret}`).digest("hex")
}

export interface CloudinaryUpload {
  url: string
  publicId: string
  format: string
}

export async function cloudinaryUpload(
  config: CloudinaryConfig,
  file: { buffer: Buffer; name: string; type?: string },
  folder: string,
): Promise<CloudinaryUpload> {
  const params: Record<string, string> = {
    folder,
    timestamp: String(Math.floor(Date.now() / 1000)),
    unique_filename: "true",
    use_filename: "true",
  }

  const form = new FormData()
  const bytes = new Uint8Array(file.buffer)
  form.append("file", new Blob([bytes], { type: file.type || "application/octet-stream" }), file.name)
  for (const [key, value] of Object.entries(params)) form.append(key, value)
  form.append("api_key", config.apiKey)
  form.append("signature", sign(params, config.apiSecret))

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/auto/upload`,
    { method: "POST", body: form },
  )
  const result = (await response.json().catch(() => ({}))) as {
    secure_url?: string
    public_id?: string
    format?: string
    error?: { message?: string }
  }
  if (!response.ok || !result.secure_url || !result.public_id) {
    throw new Error(result.error?.message ?? `Cloudinary rejected the upload (${response.status}).`)
  }

  return {
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format ?? file.name.split(".").pop() ?? "",
  }
}

/**
 * Best-effort delete. Cloudinary keys a delete by resource type, which we don't
 * record, so images are tried first and raw files (PDFs) after.
 */
export async function cloudinaryDelete(config: CloudinaryConfig, publicId: string): Promise<void> {
  for (const resourceType of ["image", "raw"]) {
    const params = { public_id: publicId, timestamp: String(Math.floor(Date.now() / 1000)) }
    const body = new URLSearchParams({
      ...params,
      api_key: config.apiKey,
      signature: sign(params, config.apiSecret),
    })
    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/${resourceType}/destroy`,
        { method: "POST", body },
      )
      const result = (await response.json().catch(() => ({}))) as { result?: string }
      if (response.ok && result.result === "ok") return
    } catch {
      /* keep going: a failed cleanup must not block the delete the user asked for */
    }
  }
}

/** Confirms a set of credentials works before we save it. */
export async function cloudinaryPing(config: CloudinaryConfig): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64")
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/ping`, {
      headers: { Authorization: `Basic ${auth}` },
    })
    if (response.ok) return { ok: true }
    if (response.status === 401) return { ok: false, error: "Cloudinary rejected that API key and secret." }
    if (response.status === 404) return { ok: false, error: "No Cloudinary account with that cloud name." }
    return { ok: false, error: `Cloudinary returned ${response.status}.` }
  } catch {
    return { ok: false, error: "Could not reach Cloudinary." }
  }
}
