import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getApplication, getDocument, updateDocument } from "@/lib/store"
import { deleteFromCloudinary, isCloudinaryConfigured, uploadBuffer } from "@/lib/cloudinary"

const MAX_BYTES = 10 * 1024 * 1024 // 10MB
const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"]

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const document = getDocument(id)
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 })
  const application = getApplication(user.id, document.applicationId)
  if (!application) return NextResponse.json({ error: "Document not found" }, { status: 404 })

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "File storage is not configured yet. Add your Cloudinary environment variables to enable uploads." },
      { status: 503 },
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 })
  }

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds the 10MB limit." }, { status: 413 })
  }
  if (file.type && !ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type. Use PDF, JPG, PNG, or WEBP." }, { status: 415 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    // Remove a previously uploaded file before replacing it.
    if (document.filePublicId) {
      await deleteFromCloudinary(document.filePublicId)
    }

    const result = await uploadBuffer(buffer, file.name, `visa-tracker/${application.id}`)

    const updated = updateDocument(id, {
      status: "uploaded",
      fileUrl: result.url,
      filePublicId: result.publicId,
      fileName: result.originalFilename,
      fileFormat: result.format,
      uploadedAt: new Date().toISOString(),
    })

    return NextResponse.json({ document: updated })
  } catch (error) {
    console.log("[v0] Cloudinary upload failed:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 })
  }
}
