import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createApplication, listApplications, listDocuments } from "@/lib/store"
import type { VisaType } from "@/lib/types"

const VISA_TYPES: VisaType[] = ["tourist", "work", "student"]

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const applications = listApplications(user.id).map((app) => {
    const docs = listDocuments(app.id)
    const uploaded = docs.filter((d) => d.status === "uploaded").length
    return {
      ...app,
      totalDocuments: docs.length,
      uploadedDocuments: uploaded,
    }
  })

  return NextResponse.json({ applications })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: {
    name?: string
    destinationCountry?: string
    visaType?: string
    travelDate?: string | null
    applicationCenter?: string | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const destinationCountry = (body.destinationCountry ?? "").trim()
  if (!destinationCountry) {
    return NextResponse.json({ error: "Please choose a destination country." }, { status: 400 })
  }

  const visaType: VisaType = VISA_TYPES.includes(body.visaType as VisaType)
    ? (body.visaType as VisaType)
    : "tourist"

  const label = visaType.charAt(0).toUpperCase() + visaType.slice(1)
  const name = (body.name ?? "").trim() || `${destinationCountry} ${label} Visa`

  const application = createApplication({
    userId: user.id,
    name,
    destinationCountry,
    visaType,
    travelDate: body.travelDate ?? null,
    applicationCenter: body.applicationCenter ?? null,
  })

  return NextResponse.json({ application }, { status: 201 })
}
