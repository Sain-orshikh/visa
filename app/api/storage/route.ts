import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { setUserStorage } from "@/lib/store"
import { decryptSecret, encryptSecret } from "@/lib/secrets"
import {
  appStorageAvailable,
  cloudinaryPing,
  isGoogleDriveAvailable,
  revokeGoogleToken,
  storageSettings,
} from "@/lib/storage"
import type { StorageProvider, UserStorage } from "@/lib/types"

const PROVIDERS: StorageProvider[] = ["app", "cloudinary", "google-drive"]

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json({ storage: storageSettings(user) })
}

/**
 * Sets where the user's uploads go. Cloudinary credentials can come along with
 * the switch; Google Drive is connected through the OAuth flow instead.
 *
 * Credentials for a provider the user isn't currently on are kept, so files
 * already uploaded there stay readable and removable.
 */
export async function PUT(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: {
    provider?: string
    cloudinary?: { cloudName?: string; apiKey?: string; apiSecret?: string }
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const provider = body.provider as StorageProvider | undefined
  if (!provider || !PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Pick a storage provider." }, { status: 400 })
  }

  const storage: UserStorage = { ...(user.storage ?? { provider: "app" }), provider }

  if (provider === "app" && !appStorageAvailable()) {
    return NextResponse.json(
      { error: "This deployment has no shared storage. Connect your own instead." },
      { status: 400 },
    )
  }

  if (provider === "cloudinary") {
    const input = body.cloudinary
    const cloudName = input?.cloudName?.trim()
    const apiKey = input?.apiKey?.trim()
    const apiSecret = input?.apiSecret?.trim()

    if (cloudName || apiKey || apiSecret) {
      if (!cloudName || !apiKey || !apiSecret) {
        return NextResponse.json(
          { error: "Enter your cloud name, API key, and API secret." },
          { status: 400 },
        )
      }
      // Fail here rather than on the user's first upload.
      const ping = await cloudinaryPing({ cloudName, apiKey, apiSecret })
      if (!ping.ok) return NextResponse.json({ error: ping.error }, { status: 400 })
      storage.cloudinary = { cloudName, apiKey, apiSecret: encryptSecret(apiSecret) }
    } else if (!storage.cloudinary || !decryptSecret(storage.cloudinary.apiSecret)) {
      return NextResponse.json({ error: "Add your Cloudinary credentials first." }, { status: 400 })
    }
  }

  if (provider === "google-drive") {
    if (!isGoogleDriveAvailable()) {
      return NextResponse.json({ error: "Google Drive is not enabled on this deployment." }, { status: 400 })
    }
    if (!storage.googleDrive || !decryptSecret(storage.googleDrive.refreshToken)) {
      return NextResponse.json({ error: "Connect a Google account first." }, { status: 400 })
    }
  }

  const updated = await setUserStorage(user.id, storage)
  if (!updated) return NextResponse.json({ error: "Account not found" }, { status: 404 })

  return NextResponse.json({ storage: storageSettings(updated) })
}

/**
 * Forgets the credentials for one provider. Files already uploaded there stay
 * listed — we simply can no longer reach them, which the settings page says.
 */
export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { target?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (body.target !== "cloudinary" && body.target !== "google-drive") {
    return NextResponse.json({ error: "Nothing to disconnect." }, { status: 400 })
  }

  const storage: UserStorage = { ...(user.storage ?? { provider: "app" }) }

  if (body.target === "cloudinary") {
    delete storage.cloudinary
  } else {
    const refreshToken = storage.googleDrive ? decryptSecret(storage.googleDrive.refreshToken) : null
    if (refreshToken) await revokeGoogleToken(refreshToken)
    delete storage.googleDrive
  }

  // Dropping the provider we were using falls back to shared storage.
  if (storage.provider === body.target) storage.provider = "app"

  const updated = await setUserStorage(user.id, storage)
  if (!updated) return NextResponse.json({ error: "Account not found" }, { status: 404 })

  return NextResponse.json({ storage: storageSettings(updated) })
}
