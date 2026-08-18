import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createFolder, getApplication, listFolders } from "@/lib/store"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const application = await getApplication(user.id, id)
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 })

  return NextResponse.json({ folders: await listFolders(application.id) })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const application = await getApplication(user.id, id)
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 })

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

  const folder = await createFolder({ applicationId: application.id, name })
  return NextResponse.json({ folder }, { status: 201 })
}
