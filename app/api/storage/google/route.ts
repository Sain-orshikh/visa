import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { encryptSecret } from "@/lib/secrets"
import { googleAuthUrl, googleRedirectUri, isGoogleDriveAvailable } from "@/lib/storage"

/**
 * Starts the Google Drive connection. The client opens the returned URL; the
 * `state` is a sealed record of who asked, which the callback checks against
 * the session so someone else's consent can't be pinned to this account.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!isGoogleDriveAvailable()) {
    return NextResponse.json(
      { error: "Google Drive is not enabled on this deployment." },
      { status: 503 },
    )
  }

  const state = encryptSecret(JSON.stringify({ userId: user.id, ts: Date.now() }))
  const url = googleAuthUrl(googleRedirectUri(request.url), state)
  return NextResponse.json({ authUrl: url })
}
