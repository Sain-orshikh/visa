import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getApplication, getDocument, removeDocumentFile } from "@/lib/store"
import { deleteFromCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, fileId } = await params
  const document = await getDocument(id)
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 })
  const application = await getApplication(user.id, document.applicationId)
  if (!application) return NextResponse.json({ error: "Document not found" }, { status: 404 })

  const file = document.files.find((f) => f.id === fileId)
  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 })

  if (file.publicId && isCloudinaryConfigured()) {
    await deleteFromCloudinary(file.publicId)
  }

  const updated = await removeDocumentFile(id, fileId)
  return NextResponse.json({ document: updated })
}
