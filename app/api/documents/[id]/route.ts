import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { deleteDocument, getApplication, getDocument, updateDocument } from "@/lib/store"
import { deleteFromCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary"

async function loadOwnedDocument(documentId: string) {
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized", status: 401 as const }
  const document = await getDocument(documentId)
  if (!document) return { error: "Document not found", status: 404 as const }
  const application = await getApplication(user.id, document.applicationId)
  if (!application) return { error: "Document not found", status: 404 as const }
  return { document }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await loadOwnedDocument(id)
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status })

  let body: { name?: string; description?: string; category?: string | null; deadline?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim()
  if (typeof body.description === "string") patch.description = body.description
  if (body.category !== undefined) patch.category = body.category
  if (body.deadline !== undefined) patch.deadline = body.deadline || null

  const document = await updateDocument(id, patch)
  return NextResponse.json({ document })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await loadOwnedDocument(id)
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status })

  const { document } = result
  if (document.filePublicId && isCloudinaryConfigured()) {
    await deleteFromCloudinary(document.filePublicId)
  }

  await deleteDocument(id)
  return NextResponse.json({ ok: true })
}
