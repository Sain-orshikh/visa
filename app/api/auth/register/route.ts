import { NextResponse } from "next/server"
import { createSession, hashPassword, toPublicUser } from "@/lib/auth"
import { createUser, findUserByEmail, seedForUser } from "@/lib/store"

export async function POST(request: Request) {
  let body: { email?: string; name?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const email = (body.email ?? "").trim().toLowerCase()
  const name = (body.name ?? "").trim()
  const password = body.password ?? ""

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 })
  }
  if (await findUserByEmail(email)) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 })
  }

  const user = await createUser({ email, name, passwordHash: hashPassword(password) })
  await seedForUser(user.id)
  await createSession(user.id)

  return NextResponse.json({ user: toPublicUser(user) }, { status: 201 })
}
