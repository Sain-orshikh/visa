import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { deleteApplication, getApplication, listDocuments } from "@/lib/store"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const application = await getApplication(user.id, id)
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 })

  const documents = await listDocuments(application.id)
  const uploaded = documents.filter((d) => d.status === "uploaded").length
  const total = documents.length
  const progress = total === 0 ? 0 : Math.round((uploaded / total) * 100)

  return NextResponse.json({
    application: { ...application, totalDocuments: total, uploadedDocuments: uploaded, progress },
    documents,
  })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const ok = await deleteApplication(user.id, id)
  if (!ok) return NextResponse.json({ error: "Application not found" }, { status: 404 })

  return NextResponse.json({ ok: true })
}
