import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { deleteFolder, getApplication, getFolder, renameFolder } from "@/lib/store"

/** Resolves a folder only if it belongs to an application the caller owns. */
async function loadOwnedFolder(folderId: string) {
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized", status: 401 as const }
  const folder = await getFolder(folderId)
  if (!folder) return { error: "Folder not found", status: 404 as const }
  const application = await getApplication(user.id, folder.applicationId)
  if (!application) return { error: "Folder not found", status: 404 as const }
  return { folder }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await loadOwnedFolder(id)
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status })

  let body: { name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const name = (body.name ?? "").trim()
  if (!name) return NextResponse.json({ error: "Enter a folder name." }, { status: 400 })
  if (name.length > 48) {
    return NextResponse.json({ error: "Keep folder names under 48 characters." }, { status: 400 })
  }

  const folder = await renameFolder(id, name)
  return NextResponse.json({ folder })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await loadOwnedFolder(id)
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status })

  // Documents inside are released to the application root, never deleted.
  await deleteFolder(id)
  return NextResponse.json({ ok: true })
}
