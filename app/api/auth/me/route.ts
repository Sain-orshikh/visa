import { NextResponse } from "next/server"
import {
  destroySession,
  getCurrentUser,
  toPublicUser,
  verifyPassword,
} from "@/lib/auth"
import { deleteUserCascade, findUserByEmail, updateUser } from "@/lib/store"
import { deleteFromCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 })
  }
  return NextResponse.json({ user: toPublicUser(user) })
}

/** Update the signed-in user's profile (name and/or email). */
export async function PATCH(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { name?: string; email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const patch: { name?: string; email?: string } = {}

  if (body.name !== undefined) {
    const name = body.name.trim()
    if (!name) return NextResponse.json({ error: "Please enter your name." }, { status: 400 })
    patch.name = name
  }

  if (body.email !== undefined) {
    const email = body.email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 })
    }
    if (email !== user.email) {
      const existing = await findUserByEmail(email)
      if (existing && existing.id !== user.id) {
        return NextResponse.json({ error: "That email is already in use." }, { status: 409 })
      }
    }
    patch.email = email
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 })
  }

  const updated = await updateUser(user.id, patch)
  if (!updated) return NextResponse.json({ error: "Account not found" }, { status: 404 })

  return NextResponse.json({ user: toPublicUser(updated) })
}

/**
 * Close the account. Requires the current password so a borrowed session
 * can't wipe someone's data. Uploaded files go with it, best-effort.
 */
export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!body.password || !verifyPassword(body.password, user.passwordHash)) {
    return NextResponse.json({ error: "That password is incorrect." }, { status: 403 })
  }

  const { filePublicIds } = await deleteUserCascade(user.id)
  if (isCloudinaryConfigured() && filePublicIds.length) {
    await Promise.all(filePublicIds.map((publicId) => deleteFromCloudinary(publicId)))
  }
  await destroySession()

  return NextResponse.json({ ok: true })
}
