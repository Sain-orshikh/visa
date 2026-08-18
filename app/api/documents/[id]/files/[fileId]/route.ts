import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getApplication, getDocument, removeDocumentFile } from "@/lib/store"
import { backendForFile } from "@/lib/storage"

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

  if (file.publicId) {
    try {
      await backendForFile(user, file).remove(file.publicId)
    } catch {
      // A provider the user has since disconnected can no longer be cleaned
      // up — that must not stop them removing the file from their checklist.
    }
  }

  const updated = await removeDocumentFile(id, fileId)
  return NextResponse.json({ document: updated })
}
