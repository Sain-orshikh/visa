import { NextResponse } from "next/server"
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth"
import { updateUser } from "@/lib/store"

/** Change the signed-in user's password. */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { currentPassword?: string; newPassword?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const currentPassword = body.currentPassword ?? ""
  const newPassword = body.newPassword ?? ""

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return NextResponse.json({ error: "Your current password is incorrect." }, { status: 403 })
  }
  // Same floor as registration, so the two can't drift apart.
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 })
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: "That is already your current password." }, { status: 400 })
  }

  await updateUser(user.id, { passwordHash: hashPassword(newPassword) })
  return NextResponse.json({ ok: true })
}
