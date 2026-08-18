import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createSupportTicket, listSupportTickets } from "@/lib/store"
import type { SupportCategory } from "@/lib/types"

const CATEGORIES: SupportCategory[] = ["documents", "account", "billing", "bug", "other"]

const MAX_SUBJECT = 120
const MAX_MESSAGE = 4000

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tickets = await listSupportTickets(user.id)
  return NextResponse.json({ tickets })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { category?: string; subject?: string; message?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const subject = (body.subject ?? "").trim()
  const message = (body.message ?? "").trim()
  const category = (body.category ?? "other") as SupportCategory

  if (!subject) {
    return NextResponse.json({ error: "Please add a subject." }, { status: 400 })
  }
  if (subject.length > MAX_SUBJECT) {
    return NextResponse.json({ error: `Subject must be ${MAX_SUBJECT} characters or fewer.` }, { status: 400 })
  }
  if (message.length < 10) {
    return NextResponse.json({ error: "Please describe the issue in a little more detail." }, { status: 400 })
  }
  if (message.length > MAX_MESSAGE) {
    return NextResponse.json({ error: `Message must be ${MAX_MESSAGE} characters or fewer.` }, { status: 400 })
  }
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Please choose a valid category." }, { status: 400 })
  }

  const ticket = await createSupportTicket({ userId: user.id, category, subject, message })
  return NextResponse.json({ ticket }, { status: 201 })
}
