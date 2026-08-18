import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getApplication, getDocument } from "@/lib/store"
import { backendForFile, StorageNotConfiguredError } from "@/lib/storage"

const MIME_BY_FORMAT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
}

/**
 * Streams a file that its provider keeps private — Google Drive uploads live
 * in the user's own account and have no public URL, so the viewer reads them
 * through here, behind the same session check as everything else.
 */
export async function GET(
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

  let backend
  try {
    backend = backendForFile(user, file)
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    throw error
  }

  if (!backend.download) {
    // Providers with public delivery URLs are served straight from the record.
    return NextResponse.redirect(file.url)
  }

  try {
    const { body, contentType } = await backend.download(file.publicId)
    const resolvedType =
      contentType === "application/octet-stream"
        ? (MIME_BY_FORMAT[file.format.toLowerCase()] ?? contentType)
        : contentType

    return new Response(body, {
      headers: {
        "Content-Type": resolvedType,
        // Inline so the viewer can preview it; the filename is for downloads.
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`,
        "Cache-Control": "private, max-age=300",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read the file."
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
