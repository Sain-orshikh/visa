import { decryptSecret } from "@/lib/secrets"
import { setUserStorage } from "@/lib/store"
import type { StorageProvider, StorageSettings, User, VisaFile } from "@/lib/types"
import {
  cloudinaryDelete,
  cloudinaryUpload,
  envCloudinaryConfig,
  type CloudinaryConfig,
} from "./cloudinary"
import {
  driveDelete,
  driveDownload,
  driveUpload,
  ensureDriveFolder,
  getAccessToken,
  isGoogleDriveAvailable,
} from "./google-drive"

export { cloudinaryPing } from "./cloudinary"
export {
  exchangeGoogleCode,
  googleAuthUrl,
  googleRedirectUri,
  isGoogleDriveAvailable,
  revokeGoogleToken,
} from "./google-drive"

/**
 * One face over every place a file can live. Routes ask for a backend and stay
 * out of the question of whose account is on the other end of it.
 */
export interface StorageBackend {
  provider: StorageProvider
  /**
   * A direct delivery URL when the provider has one. Null means the file is
   * private to the user's account and has to be streamed through our own route.
   */
  upload(
    file: { buffer: Buffer; name: string; type?: string },
    applicationId: string,
  ): Promise<{ url: string | null; publicId: string; format: string }>
  remove(publicId: string): Promise<void>
  /** Only the providers that keep files private implement this. */
  download?(publicId: string): Promise<{ body: ReadableStream<Uint8Array>; contentType: string }>
}

export class StorageNotConfiguredError extends Error {}

function extensionOf(filename: string): string {
  const parts = filename.split(".")
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ""
}

/* ------------------------------- Cloudinary ------------------------------- */

function cloudinaryBackend(config: CloudinaryConfig, provider: StorageProvider): StorageBackend {
  return {
    provider,
    async upload(file, applicationId) {
      const result = await cloudinaryUpload(config, file, `visa-tracker/${applicationId}`)
      return { url: result.url, publicId: result.publicId, format: result.format }
    },
    remove: (publicId) => cloudinaryDelete(config, publicId),
  }
}

/** The user's own Cloudinary account, with the API secret unsealed. */
function userCloudinaryConfig(user: User): CloudinaryConfig | null {
  const credentials = user.storage?.cloudinary
  if (!credentials) return null
  const apiSecret = decryptSecret(credentials.apiSecret)
  if (!apiSecret) return null
  return { cloudName: credentials.cloudName, apiKey: credentials.apiKey, apiSecret }
}

/* ------------------------------ Google Drive ------------------------------ */

function driveBackend(user: User, refreshToken: string, folderId: string | null): StorageBackend {
  return {
    provider: "google-drive",
    async upload(file) {
      const accessToken = await getAccessToken(refreshToken)
      const parent = await ensureDriveFolder(accessToken, folderId)
      if (parent !== folderId) await rememberDriveFolder(user, parent)
      const { fileId } = await driveUpload(accessToken, file, parent)
      // Drive files stay private, so they are read back through our own route.
      return { url: null, publicId: fileId, format: extensionOf(file.name) }
    },
    async remove(publicId) {
      const accessToken = await getAccessToken(refreshToken)
      await driveDelete(accessToken, publicId)
    },
    async download(publicId) {
      const accessToken = await getAccessToken(refreshToken)
      return driveDownload(accessToken, publicId)
    },
  }
}

/** Records the folder Drive gave us so later uploads skip the lookup. */
async function rememberDriveFolder(user: User, folderId: string): Promise<void> {
  const storage = user.storage
  if (!storage?.googleDrive) return
  try {
    await setUserStorage(user.id, {
      ...storage,
      googleDrive: { ...storage.googleDrive, folderId },
    })
  } catch {
    /* only a shortcut — the folder is found by name next time regardless */
  }
}

function userDriveRefreshToken(user: User): string | null {
  const credentials = user.storage?.googleDrive
  if (!credentials) return null
  return decryptSecret(credentials.refreshToken)
}

/* -------------------------------- Resolving ------------------------------- */

export function appStorageAvailable(): boolean {
  return envCloudinaryConfig() !== null
}

/** The provider a user's uploads go to right now. */
export function activeProvider(user: User): StorageProvider {
  return user.storage?.provider ?? "app"
}

/**
 * Backend for a given provider. Throws StorageNotConfiguredError with a message
 * meant for the user when the credentials it needs aren't there.
 */
function backendFor(user: User, provider: StorageProvider): StorageBackend {
  if (provider === "cloudinary") {
    const config = userCloudinaryConfig(user)
    if (!config) {
      throw new StorageNotConfiguredError(
        "Your Cloudinary credentials are missing or unreadable. Re-enter them in Settings → Storage.",
      )
    }
    return cloudinaryBackend(config, "cloudinary")
  }

  if (provider === "google-drive") {
    if (!isGoogleDriveAvailable()) {
      throw new StorageNotConfiguredError("Google Drive is not enabled on this deployment.")
    }
    const refreshToken = userDriveRefreshToken(user)
    if (!refreshToken) {
      throw new StorageNotConfiguredError(
        "Your Google Drive connection is missing or expired. Reconnect it in Settings → Storage.",
      )
    }
    return driveBackend(user, refreshToken, user.storage?.googleDrive?.folderId ?? null)
  }

  const config = envCloudinaryConfig()
  if (!config) {
    throw new StorageNotConfiguredError(
      "File storage is not configured on this deployment. Connect your own storage in Settings → Storage.",
    )
  }
  return cloudinaryBackend(config, "app")
}

/** Where new uploads for this user go. */
export function uploadBackend(user: User): StorageBackend {
  return backendFor(user, activeProvider(user))
}

/**
 * Backend for a file already on record. Files carry the provider they were
 * uploaded to, so switching providers never orphans the earlier ones.
 */
export function backendForFile(user: User, file: Pick<VisaFile, "provider">): StorageBackend {
  return backendFor(user, file.provider ?? "app")
}

/**
 * Best-effort cleanup for the cascading deletes. A provider the user has since
 * disconnected can't be cleaned up, and that must not block the delete itself.
 */
export async function removeStoredFiles(
  user: User,
  files: Array<Pick<VisaFile, "publicId" | "provider">>,
): Promise<void> {
  await Promise.all(
    files.map(async (file) => {
      if (!file.publicId) return
      try {
        await backendForFile(user, file).remove(file.publicId)
      } catch {
        /* ignore: the record is going away either way */
      }
    }),
  )
}

/** Storage state for the settings page — secrets never leave the server. */
export function storageSettings(user: User): StorageSettings {
  const cloudinary = user.storage?.cloudinary
  const googleDrive = user.storage?.googleDrive
  return {
    provider: activeProvider(user),
    appStorageAvailable: appStorageAvailable(),
    googleDriveAvailable: isGoogleDriveAvailable(),
    cloudinary: cloudinary ? { cloudName: cloudinary.cloudName, apiKey: cloudinary.apiKey } : null,
    googleDrive: googleDrive
      ? { accountEmail: googleDrive.accountEmail, folderId: googleDrive.folderId }
      : null,
  }
}
