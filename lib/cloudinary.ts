import { v2 as cloudinary } from "cloudinary"

/**
 * Cloudinary is configured from environment variables. Add these to your
 * Vercel project (Project Settings → Environment Variables):
 *
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *
 * Or a single CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud_name>
 */
let configured = false

function ensureConfigured() {
  if (configured) return
  // The SDK auto-parses CLOUDINARY_URL on its first config() call. Only pass
  // the discrete vars when they're actually set — passing `undefined` keys
  // here would overwrite the values already parsed from CLOUDINARY_URL.
  const overrides: Record<string, string> = {}
  if (process.env.CLOUDINARY_CLOUD_NAME) overrides.cloud_name = process.env.CLOUDINARY_CLOUD_NAME
  if (process.env.CLOUDINARY_API_KEY) overrides.api_key = process.env.CLOUDINARY_API_KEY
  if (process.env.CLOUDINARY_API_SECRET) overrides.api_secret = process.env.CLOUDINARY_API_SECRET
  cloudinary.config({ ...overrides, secure: true })
  configured = true
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) ||
      process.env.CLOUDINARY_URL,
  )
}

export interface UploadResult {
  url: string
  publicId: string
  format: string
  originalFilename: string
}

export async function uploadBuffer(buffer: Buffer, filename: string, folder = "visa-tracker"): Promise<UploadResult> {
  ensureConfigured()
  return new Promise<UploadResult>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Upload failed"))
          return
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format ?? filename.split(".").pop() ?? "",
          originalFilename: filename,
        })
      },
    )
    stream.end(buffer)
  })
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  ensureConfigured()
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" })
  } catch {
    // best-effort: also try raw resource type
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: "raw" })
    } catch {
      /* ignore */
    }
  }
}
