import { NextResponse } from "next/server"
import { createSession, toPublicUser, verifyPassword } from "@/lib/auth"
import { findUserByEmail } from "@/lib/store"

export async function POST(request: Request) {
  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const email = (body.email ?? "").trim().toLowerCase()
  const password = body.password ?? ""

  const user = findUserByEmail(email)
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 })
  }

  await createSession(user.id)
  return NextResponse.json({ user: toPublicUser(user) })
}
