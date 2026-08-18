import { randomUUID } from "crypto"
import type { User, VisaApplication, VisaDocument, VisaType } from "./types"

/**
 * In-memory data store.
 *
 * The user opted for in-memory / JSON persistence instead of a database.
 * Data lives in a module-level singleton attached to `globalThis` so it
 * survives hot reloads in development. On serverless it is per-instance and
 * will reset when the instance is recycled — acceptable for this prototype.
 */
interface Db {
  users: User[]
  applications: VisaApplication[]
  documents: VisaDocument[]
}

const globalForDb = globalThis as unknown as { __visaTrackerDb?: Db }

const db: Db =
  globalForDb.__visaTrackerDb ??
  (globalForDb.__visaTrackerDb = {
    users: [],
    applications: [],
    documents: [],
  })

/* ---------------------------------- Users --------------------------------- */

export function findUserByEmail(email: string): User | undefined {
  const normalized = email.trim().toLowerCase()
  return db.users.find((u) => u.email === normalized)
}

export function findUserById(id: string): User | undefined {
  return db.users.find((u) => u.id === id)
}

export function createUser(input: { email: string; name: string; passwordHash: string }): User {
  const user: User = {
    id: randomUUID(),
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    passwordHash: input.passwordHash,
    createdAt: new Date().toISOString(),
  }
  db.users.push(user)
  return user
}

/* ------------------------------ Applications ------------------------------ */

export function listApplications(userId: string): VisaApplication[] {
  return db.applications
    .filter((a) => a.userId === userId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function getApplication(userId: string, id: string): VisaApplication | undefined {
  return db.applications.find((a) => a.id === id && a.userId === userId)
}

export function createApplication(input: {
  userId: string
  name: string
  destinationCountry: string
  visaType: VisaType
  travelDate?: string | null
  applicationCenter?: string | null
}): VisaApplication {
  const app: VisaApplication = {
    id: randomUUID(),
    userId: input.userId,
    name: input.name,
    destinationCountry: input.destinationCountry,
    visaType: input.visaType,
    travelDate: input.travelDate ?? null,
    applicationCenter: input.applicationCenter ?? null,
    createdAt: new Date().toISOString(),
  }
  db.applications.push(app)
  return app
}

export function deleteApplication(userId: string, id: string): boolean {
  const app = getApplication(userId, id)
  if (!app) return false
  db.applications = db.applications.filter((a) => a.id !== id)
  db.documents = db.documents.filter((d) => d.applicationId !== id)
  return true
}

/* -------------------------------- Documents ------------------------------- */

export function listDocuments(applicationId: string): VisaDocument[] {
  return db.documents
    .filter((d) => d.applicationId === applicationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function getDocument(id: string): VisaDocument | undefined {
  return db.documents.find((d) => d.id === id)
}

export function createDocument(input: {
  applicationId: string
  name: string
  description?: string
  category?: string | null
  deadline?: string | null
}): VisaDocument {
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
  db.documents.push(doc)
  return doc
}

export function updateDocument(id: string, patch: Partial<VisaDocument>): VisaDocument | undefined {
  const doc = getDocument(id)
  if (!doc) return undefined
  Object.assign(doc, patch)
  return doc
}

export function deleteDocument(id: string): boolean {
  const exists = db.documents.some((d) => d.id === id)
  db.documents = db.documents.filter((d) => d.id !== id)
  return exists
}

/* --------------------------------- Seeding -------------------------------- */

const SCHENGEN_DOCS: Array<{ name: string; description: string; category: string }> = [
  { name: "Passport Copy", description: "Must be valid for 6 months beyond return date.", category: "identity" },
  { name: "Bank Statements", description: "Last 3 months showing sufficient funds (€100/day approx).", category: "financial" },
  { name: "Flight Itinerary", description: "Round-trip reservation or confirmed ticket.", category: "travel" },
  { name: "Travel Insurance", description: "Minimum coverage of €30,000 for medical emergencies.", category: "identity" },
]

/** Give a brand-new user a starter application so the dashboard is not empty. */
export function seedForUser(userId: string): void {
  const app = createApplication({
    userId,
    name: "Schengen Visa",
    destinationCountry: "France",
    visaType: "tourist",
    travelDate: null,
    applicationCenter: "lon",
  })
  for (const d of SCHENGEN_DOCS) {
    createDocument({ applicationId: app.id, name: d.name, description: d.description, category: d.category })
  }
}
