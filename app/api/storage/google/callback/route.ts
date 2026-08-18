import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { setUserStorage } from "@/lib/store"
import { decryptSecret, encryptSecret } from "@/lib/secrets"
import { exchangeGoogleCode, googleRedirectUri } from "@/lib/storage"
import type { UserStorage } from "@/lib/types"

const STATE_MAX_AGE = 10 * 60 * 1000 // 10 minutes

/** Back to settings with a message the page can show inline. */
function settingsRedirect(request: Request, params: Record<string, string>) {
  const url = new URL("/settings", process.env.APP_URL ?? new URL(request.url).origin)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return NextResponse.redirect(url)
}

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.redirect(new URL("/login", new URL(request.url).origin))

  const url = new URL(request.url)
  const error = url.searchParams.get("error")
  if (error) {
    return settingsRedirect(request, {
      storage_error: error === "access_denied" ? "Google Drive connection was cancelled." : error,
    })
  }

  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  if (!code || !state) {
    return settingsRedirect(request, { storage_error: "Google sent an incomplete response." })
  }

  // The state is sealed with our own key, so this both authenticates it and
  // tells us which account started the flow.
  const opened = decryptSecret(state)
  if (!opened) return settingsRedirect(request, { storage_error: "That connection link is no longer valid." })

  let payload: { userId?: string; ts?: number }
  try {
    payload = JSON.parse(opened)
  } catch {
    return settingsRedirect(request, { storage_error: "That connection link is no longer valid." })
  }
  if (payload.userId !== user.id || !payload.ts || Date.now() - payload.ts > STATE_MAX_AGE) {
    return settingsRedirect(request, { storage_error: "That connection link has expired. Try again." })
  }

  try {
    const connection = await exchangeGoogleCode(code, googleRedirectUri(request.url))
    const storage: UserStorage = {
      ...(user.storage ?? { provider: "app" }),
      provider: "google-drive",
      googleDrive: {
        refreshToken: encryptSecret(connection.refreshToken),
        // The folder is created lazily on the first upload.
        folderId: null,
        accountEmail: connection.accountEmail,
      },
    }
    await setUserStorage(user.id, storage)
    return settingsRedirect(request, { storage_connected: "google-drive" })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not connect Google Drive."
    return settingsRedirect(request, { storage_error: message })
  }
}
