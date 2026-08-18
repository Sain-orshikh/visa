import { randomUUID } from "crypto"
import { getDb } from "./mongodb"
import type { User, VisaApplication, VisaDocument, VisaType } from "./types"

/**
 * Data layer backed by MongoDB. Every document keeps its own `id` (a UUID)
 * as the public identifier — Mongo's `_id` is never exposed to callers, so
 * the rest of the app (API routes, client types) is unaffected by the
 * storage engine underneath.
 */

const NO_ID = { projection: { _id: 0 } } as const

async function users() {
  return (await getDb()).collection<User>("users")
}
async function applications() {
  return (await getDb()).collection<VisaApplication>("applications")
}
async function documents() {
  return (await getDb()).collection<VisaDocument>("documents")
}

/* ---------------------------------- Users --------------------------------- */

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const normalized = email.trim().toLowerCase()
  const doc = await (await users()).findOne({ email: normalized }, NO_ID)
  return doc ?? undefined
}

export async function findUserById(id: string): Promise<User | undefined> {
  const doc = await (await users()).findOne({ id }, NO_ID)
  return doc ?? undefined
}

export async function createUser(input: { email: string; name: string; passwordHash: string }): Promise<User> {
  const user: User = {
    id: randomUUID(),
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    passwordHash: input.passwordHash,
    createdAt: new Date().toISOString(),
  }
  await (await users()).insertOne({ ...user })
  return user
}

/* ------------------------------ Applications ------------------------------ */

export async function listApplications(userId: string): Promise<VisaApplication[]> {
  return (await applications()).find({ userId }, NO_ID).sort({ createdAt: 1 }).toArray()
}

export async function getApplication(userId: string, id: string): Promise<VisaApplication | undefined> {
  const doc = await (await applications()).findOne({ id, userId }, NO_ID)
  return doc ?? undefined
}

export async function createApplication(input: {
  userId: string
  name: string
  destinationCountry: string
  visaType: VisaType
  travelDate?: string | null
  applicationCenter?: string | null
  applicantName?: string | null
  notes?: string | null
}): Promise<VisaApplication> {
  const app: VisaApplication = {
    id: randomUUID(),
    userId: input.userId,
    name: input.name,
    destinationCountry: input.destinationCountry,
    visaType: input.visaType,
    travelDate: input.travelDate ?? null,
    applicationCenter: input.applicationCenter ?? null,
    applicantName: input.applicantName ?? null,
    notes: input.notes ?? null,
    createdAt: new Date().toISOString(),
  }
  await (await applications()).insertOne({ ...app })
  return app
}

export async function deleteApplication(userId: string, id: string): Promise<boolean> {
  const app = await getApplication(userId, id)
  if (!app) return false
  await (await applications()).deleteOne({ id })
  await (await documents()).deleteMany({ applicationId: id })
  return true
}

/* -------------------------------- Documents ------------------------------- */

export async function listDocuments(applicationId: string): Promise<VisaDocument[]> {
  return (await documents()).find({ applicationId }, NO_ID).sort({ createdAt: 1 }).toArray()
}

export async function getDocument(id: string): Promise<VisaDocument | undefined> {
  const doc = await (await documents()).findOne({ id }, NO_ID)
  return doc ?? undefined
}

export async function createDocument(input: {
  applicationId: string
  name: string
  description?: string
  category?: string | null
  deadline?: string | null
}): Promise<VisaDocument> {
  const doc: VisaDocument = {
    id: randomUUID(),
    applicationId: input.applicationId,
    name: input.name,
    description: input.description ?? "",
    category: input.category ?? null,
    deadline: input.deadline ?? null,
    status: "pending",
    fileUrl: null,
    filePublicId: null,
    fileName: null,
    fileFormat: null,
    uploadedAt: null,
    createdAt: new Date().toISOString(),
  }
  await (await documents()).insertOne({ ...doc })
  return doc
}

export async function updateDocument(
  id: string,
  patch: Partial<VisaDocument>,
): Promise<VisaDocument | undefined> {
  const { id: _ignoredId, ...safePatch } = patch
  const result = await (await documents()).findOneAndUpdate(
    { id },
    { $set: safePatch },
    { returnDocument: "after", projection: { _id: 0 } },
  )
  return result ?? undefined
}

export async function deleteDocument(id: string): Promise<boolean> {
  const result = await (await documents()).deleteOne({ id })
  return result.deletedCount > 0
}

/* --------------------------------- Seeding -------------------------------- */

const SCHENGEN_DOCS: Array<{ name: string; description: string; category: string }> = [
  { name: "Passport Copy", description: "Must be valid for 6 months beyond return date.", category: "identity" },
  { name: "Bank Statements", description: "Last 3 months showing sufficient funds (€100/day approx).", category: "financial" },
  { name: "Flight Itinerary", description: "Round-trip reservation or confirmed ticket.", category: "travel" },
  { name: "Travel Insurance", description: "Minimum coverage of €30,000 for medical emergencies.", category: "identity" },
]

/** Give a brand-new user a starter application so the dashboard is not empty. */
export async function seedForUser(userId: string): Promise<void> {
  const app = await createApplication({
    userId,
    name: "Schengen Visa",
    destinationCountry: "France",
    visaType: "tourist",
    travelDate: null,
    applicationCenter: "lon",
  })
  for (const d of SCHENGEN_DOCS) {
    await createDocument({ applicationId: app.id, name: d.name, description: d.description, category: d.category })
  }
}
