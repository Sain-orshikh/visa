import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { addUserCategory, deleteUserCategory, listUserCategories } from "@/lib/store"
import { BUILT_IN_CATEGORIES, OTHER_CATEGORY, slugifyCategory } from "@/lib/categories"

const RESERVED = new Set([...BUILT_IN_CATEGORIES.map((c) => c.key), OTHER_CATEGORY.key])

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json({ categories: await listUserCategories(user.id) })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { label?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const label = (body.label ?? "").trim()
  if (!label) return NextResponse.json({ error: "Enter a category name." }, { status: 400 })
  if (label.length > 32) {
    return NextResponse.json({ error: "Keep category names under 32 characters." }, { status: 400 })
  }

  const id = slugifyCategory(label)
  if (!id) return NextResponse.json({ error: "Use at least one letter or number." }, { status: 400 })
  if (RESERVED.has(id)) {
    return NextResponse.json({ error: `"${label}" is already a built-in category.` }, { status: 409 })
  }

  const existing = await listUserCategories(user.id)
  if (existing.some((c) => c.id === id)) {
    return NextResponse.json({ error: "You already have a category with that name." }, { status: 409 })
  }

  const categories = await addUserCategory(user.id, { id, label })
  return NextResponse.json({ categories }, { status: 201 })
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const id = (body.id ?? "").trim()
  if (!id) return NextResponse.json({ error: "Category id is required." }, { status: 400 })
  if (RESERVED.has(id)) {
    return NextResponse.json({ error: "Built-in categories cannot be removed." }, { status: 400 })
  }

  const categories = await deleteUserCategory(user.id, id)
  return NextResponse.json({ categories })
}
