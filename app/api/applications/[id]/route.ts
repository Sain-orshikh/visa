import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  deleteApplication,
  getApplication,
  listDocuments,
  listFolders,
  setApplicationArchived,
} from "@/lib/store"
import { deleteFromCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const application = await getApplication(user.id, id)
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 })

  const documents = await listDocuments(application.id)
  const folders = await listFolders(application.id)
  const uploaded = documents.filter((d) => d.status === "uploaded").length
  const total = documents.length
  const progress = total === 0 ? 0 : Math.round((uploaded / total) * 100)

  return NextResponse.json({
    application: { ...application, totalDocuments: total, uploadedDocuments: uploaded, progress },
    documents,
    folders,
  })
}

/** Currently only carries the archive toggle. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  let body: { archived?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (typeof body.archived !== "boolean") {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 })
  }

  const application = await setApplicationArchived(user.id, id, body.archived)
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 })

  return NextResponse.json({ application })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const result = await deleteApplication(user.id, id)
  if (!result) return NextResponse.json({ error: "Application not found" }, { status: 404 })

  if (isCloudinaryConfigured() && result.filePublicIds.length) {
    await Promise.all(result.filePublicIds.map((publicId) => deleteFromCloudinary(publicId)))
  }

  return NextResponse.json({ ok: true })
}
