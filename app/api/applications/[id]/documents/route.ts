import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createDocument, getApplication } from "@/lib/store"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const application = getApplication(user.id, id)
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 })

  let body: { name?: string; description?: string; category?: string | null; deadline?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const name = (body.name ?? "").trim()
  if (!name) return NextResponse.json({ error: "Document name is required." }, { status: 400 })

  const document = createDocument({
    applicationId: application.id,
    name,
    description: body.description?.trim() ?? "",
    category: body.category ?? null,
    deadline: body.deadline || null,
  })

  return NextResponse.json({ document }, { status: 201 })
}
