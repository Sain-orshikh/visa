import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { addDocumentFiles, getApplication, getDocument } from "@/lib/store"
import { StorageNotConfiguredError, uploadBackend } from "@/lib/storage"
import type { VisaFile } from "@/lib/types"

// Vercel serverless functions hard-cap the request body at 4.5MB regardless
// of app config, so this stays under that with room for multipart overhead.
const MAX_BYTES = 4 * 1024 * 1024 // 4MB
const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"]

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const document = await getDocument(id)
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 })
  const application = await getApplication(user.id, document.applicationId)
  if (!application) return NextResponse.json({ error: "Document not found" }, { status: 404 })

  // Whichever storage the user picked in Settings → Storage.
  let backend
  try {
    backend = uploadBackend(user)
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    throw error
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 })
  }

  const files = formData.getAll("file").filter((f): f is File => f instanceof File)
  if (files.length === 0) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 })
  }
  for (const file of files) {
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: `"${file.name}" exceeds the 4MB limit.` }, { status: 413 })
    }
    if (file.type && !ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported file type. Use PDF, JPG, PNG, or WEBP." }, { status: 415 })
    }
  }

  try {
    const uploaded: VisaFile[] = []
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const fileId = randomUUID()
      const result = await backend.upload({ buffer, name: file.name, type: file.type }, application.id)
      uploaded.push({
        id: fileId,
        // Providers that keep files private hand back no public URL, so those
        // are read through our own streaming route instead.
        url: result.url ?? `/api/documents/${id}/files/${fileId}/content`,
        publicId: result.publicId,
        provider: backend.provider,
        name: file.name,
        format: result.format,
        uploadedAt: new Date().toISOString(),
      })
    }

    const updated = await addDocumentFiles(id, uploaded)
    return NextResponse.json({ document: updated })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : ((error as { message?: string } | undefined)?.message ?? JSON.stringify(error))
    console.log("[storage] upload failed:", message)
    return NextResponse.json({ error: `Upload failed: ${message}` }, { status: 500 })
  }
}
