import { createHash } from "crypto"

/**
 * Google Drive over the REST API. Uploads use the `drive.file` scope, which
 * only ever grants access to files this app itself created — connecting an
 * account never exposes the rest of someone's Drive to us.
 */

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo"
const DRIVE_API = "https://www.googleapis.com/drive/v3/files"
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files"

const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
]

export const DRIVE_FOLDER_NAME = "Visa Tracker"

export function isGoogleDriveAvailable(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

function clientCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("Google Drive is not enabled on this deployment.")
  }
  return { clientId, clientSecret }
}

/**
 * The redirect Google sends the user back to. Fixed by APP_URL when set — it
 * has to match a URI registered on the OAuth client either way.
 */
export function googleRedirectUri(requestUrl: string): string {
  const base = process.env.APP_URL ?? new URL(requestUrl).origin
  return new URL("/api/storage/google/callback", base).toString()
}

export function googleAuthUrl(redirectUri: string, state: string): string {
  const { clientId } = clientCredentials()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    // Offline + consent is what actually returns a refresh token; without the
    // prompt Google omits it for an account that has approved us before.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  })
  return `${AUTH_ENDPOINT}?${params.toString()}`
}

async function tokenRequest(body: Record<string, string>): Promise<{
  access_token: string
  refresh_token?: string
  expires_in: number
}> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  })
  const data = (await response.json().catch(() => ({}))) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    error_description?: string
    error?: string
  }
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "Google rejected the token request.")
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in ?? 3600,
  }
}

export interface GoogleConnection {
  refreshToken: string
  accessToken: string
  accountEmail: string | null
}

/** Completes the OAuth handshake and reads back which account was connected. */
export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<GoogleConnection> {
  const { clientId, clientSecret } = clientCredentials()
  const tokens = await tokenRequest({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  })
  if (!tokens.refresh_token) {
    throw new Error(
      "Google did not return a refresh token. Remove Passage from your Google account permissions and try again.",
    )
  }

  let accountEmail: string | null = null
  try {
    const response = await fetch(USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (response.ok) {
      const info = (await response.json()) as { email?: string }
      accountEmail = info.email ?? null
    }
  } catch {
    /* the email is only a label in settings — not worth failing the connect */
  }

  return { refreshToken: tokens.refresh_token, accessToken: tokens.access_token, accountEmail }
}

/**
 * Access tokens last an hour, so they are cached in-process rather than minted
 * on every file operation. Keyed by a hash so the token itself is not the key.
 */
const accessTokens = new Map<string, { token: string; expiresAt: number }>()

export async function getAccessToken(refreshToken: string): Promise<string> {
  const key = createHash("sha256").update(refreshToken).digest("hex")
  const cached = accessTokens.get(key)
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token

  const { clientId, clientSecret } = clientCredentials()
  const tokens = await tokenRequest({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  })
  accessTokens.set(key, { token: tokens.access_token, expiresAt: Date.now() + tokens.expires_in * 1000 })
  return tokens.access_token
}

/** Revokes the connection on Google's side so nothing is left dangling. */
export async function revokeGoogleToken(refreshToken: string): Promise<void> {
  accessTokens.delete(createHash("sha256").update(refreshToken).digest("hex"))
  try {
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refreshToken }),
    })
  } catch {
    /* best-effort */
  }
}

async function driveError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } }
  return body.error?.message ?? `${fallback} (${response.status})`
}

/** Finds or creates the app's own folder. Returns its Drive id. */
export async function ensureDriveFolder(accessToken: string, existingId: string | null): Promise<string> {
  if (existingId) {
    const check = await fetch(`${DRIVE_API}/${encodeURIComponent(existingId)}?fields=id,trashed`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (check.ok) {
      const folder = (await check.json()) as { id: string; trashed?: boolean }
      if (!folder.trashed) return folder.id
    }
  }

  // Look before creating, so a user whose folder id we never recorded doesn't
  // collect a new "Visa Tracker" folder on every upload. Under drive.file this
  // only ever sees folders this app made itself.
  const query = [
    "mimeType = 'application/vnd.google-apps.folder'",
    `name = '${DRIVE_FOLDER_NAME.replace(/'/g, "\\'")}'`,
    "trashed = false",
  ].join(" and ")
  const search = await fetch(
    `${DRIVE_API}?q=${encodeURIComponent(query)}&fields=files(id)&pageSize=1`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (search.ok) {
    const found = (await search.json()) as { files?: Array<{ id: string }> }
    if (found.files?.[0]?.id) return found.files[0].id
  }

  const response = await fetch(`${DRIVE_API}?fields=id`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: DRIVE_FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  })
  if (!response.ok) {
    throw new Error(await driveError(response, "Could not create the Visa Tracker folder in Drive."))
  }
  const created = (await response.json()) as { id: string }
  return created.id
}

export async function driveUpload(
  accessToken: string,
  file: { buffer: Buffer; name: string; type?: string },
  parentFolderId: string,
): Promise<{ fileId: string }> {
  const boundary = `vt${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`
  const metadata = JSON.stringify({ name: file.name, parents: [parentFolderId] })
  const contentType = file.type || "application/octet-stream"

  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`,
    ),
    file.buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ])

  const response = await fetch(`${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: new Uint8Array(body),
  })
  if (!response.ok) throw new Error(await driveError(response, "Google Drive rejected the upload."))

  const created = (await response.json()) as { id: string }
  return { fileId: created.id }
}

export async function driveDelete(accessToken: string, fileId: string): Promise<void> {
  await fetch(`${DRIVE_API}/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => undefined)
}

/** Streams a file back out of Drive so the browser can render it. */
export async function driveDownload(
  accessToken: string,
  fileId: string,
): Promise<{ body: ReadableStream<Uint8Array>; contentType: string }> {
  const response = await fetch(`${DRIVE_API}/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok || !response.body) {
    throw new Error(await driveError(response, "Could not read the file from Google Drive."))
  }
  return {
    body: response.body,
    contentType: response.headers.get("content-type") ?? "application/octet-stream",
  }
}
