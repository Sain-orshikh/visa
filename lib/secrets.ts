import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto"

/**
 * Symmetric encryption for the storage credentials users hand us. They sit in
 * Mongo alongside everything else, so anything secret (a Cloudinary API secret,
 * a Google refresh token) is sealed with a key derived from SESSION_SECRET
 * rather than written in the clear.
 *
 * Rotating SESSION_SECRET invalidates stored credentials — users reconnect.
 */
const SECRET = process.env.SESSION_SECRET ?? "dev-insecure-secret-change-me"
const KEY = scryptSync(SECRET, "visa-tracker-storage", 32)
const PREFIX = "enc.v1."

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", KEY, iv)
  const sealed = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${sealed.toString("base64url")}`
}

/** Returns null when the value can't be opened (wrong/rotated SESSION_SECRET). */
export function decryptSecret(value: string): string | null {
  if (!value.startsWith(PREFIX)) return null
  const [ivPart, tagPart, dataPart] = value.slice(PREFIX.length).split(".")
  if (!ivPart || !tagPart || !dataPart) return null
  try {
    const decipher = createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivPart, "base64url"))
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"))
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, "base64url")),
      decipher.final(),
    ]).toString("utf8")
  } catch {
    return null
  }
}
