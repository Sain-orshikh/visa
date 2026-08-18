import { cookies } from "next/headers"
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto"
import { findUserById } from "./store"
import type { PublicUser, User } from "./types"

const COOKIE_NAME = "vt_session"
const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

/**
 * Secret used to sign session cookies. Set SESSION_SECRET in the environment
 * for production; a dev fallback keeps things working locally.
 */
const SECRET = process.env.SESSION_SECRET ?? "dev-insecure-secret-change-me"

/* ------------------------------- Passwords -------------------------------- */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const derived = scryptSync(password, salt, 64).toString("hex")
  return `${salt}:${derived}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":")
  if (!salt || !key) return false
  const derived = scryptSync(password, salt, 64)
  const keyBuffer = Buffer.from(key, "hex")
  if (keyBuffer.length !== derived.length) return false
  return timingSafeEqual(keyBuffer, derived)
}

/* -------------------------------- Sessions -------------------------------- */

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("hex")
}

function serializeToken(userId: string): string {
  const signature = sign(userId)
  return `${userId}.${signature}`
}

function parseToken(token: string): string | null {
  const [userId, signature] = token.split(".")
  if (!userId || !signature) return null
  const expected = sign(userId)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return userId
}

export async function createSession(userId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, serializeToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  })
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  const userId = parseToken(token)
  if (!userId) return null
  return findUserById(userId) ?? null
}

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, name: user.name }
}
