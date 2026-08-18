import { randomUUID } from "crypto"
import { getDb } from "./mongodb"
import type {
  DocumentStatus,
  SupportCategory,
  SupportTicket,
  User,
  UserCategory,
  VisaApplication,
  VisaDocument,
  VisaFile,
  VisaFolder,
  VisaType,
} from "./types"

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
async function folders() {
  return (await getDb()).collection<VisaFolder>("folders")
}
async function supportTickets() {
  return (await getDb()).collection<SupportTicket>("supportTickets")
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

export async function updateUser(
  id: string,
  patch: { name?: string; email?: string; passwordHash?: string },
): Promise<User | undefined> {
  const safePatch: Partial<User> = {}
  if (patch.name !== undefined) safePatch.name = patch.name.trim()
  if (patch.email !== undefined) safePatch.email = patch.email.trim().toLowerCase()
  if (patch.passwordHash !== undefined) safePatch.passwordHash = patch.passwordHash
  if (Object.keys(safePatch).length === 0) return findUserById(id)

  const result = await (await users()).findOneAndUpdate(
    { id },
    { $set: safePatch },
    { returnDocument: "after", projection: { _id: 0 } },
  )
  return result ?? undefined
}

/* --------------------------- User categories ------------------------------ */

export async function listUserCategories(userId: string): Promise<UserCategory[]> {
  const user = await findUserById(userId)
  return user?.categories ?? []
}

/** Adds a category, ignoring a repeat of one the user already has. */
export async function addUserCategory(userId: string, category: UserCategory): Promise<UserCategory[]> {
  const existing = await listUserCategories(userId)
  if (existing.some((c) => c.id === category.id)) return existing
  const categories = [...existing, category]
  await (await users()).updateOne({ id: userId }, { $set: { categories } })
  return categories
}

/**
 * Removes a category and releases any documents still filed under it back to
 * the "Other" bucket, so nothing ends up pointing at a category that's gone.
 */
export async function deleteUserCategory(userId: string, categoryId: string): Promise<UserCategory[]> {
  const categories = (await listUserCategories(userId)).filter((c) => c.id !== categoryId)
  await (await users()).updateOne({ id: userId }, { $set: { categories } })

  const ownedApps = await (await applications()).find({ userId }, NO_ID).toArray()
  const appIds = ownedApps.map((a) => a.id)
  if (appIds.length) {
    await (await documents()).updateMany(
      { applicationId: { $in: appIds }, category: categoryId },
      { $set: { category: null } },
    )
  }
  return categories
}

/**
 * Removes the user and everything hanging off them. Returns the public ids of
 * any uploaded files so the caller can clear them from Cloudinary — the store
 * itself stays free of upload-provider concerns.
 */
export async function deleteUserCascade(id: string): Promise<{ filePublicIds: string[] }> {
  const ownedApps = await (await applications()).find({ userId: id }, NO_ID).toArray()
  const appIds = ownedApps.map((a) => a.id)

  const ownedDocs = appIds.length
    ? await (await documents()).find({ applicationId: { $in: appIds } }, NO_ID).toArray()
    : []
  const filePublicIds = ownedDocs.flatMap((d) => normalizeDocument(d).files.map((f) => f.publicId))

  if (appIds.length) {
    await (await documents()).deleteMany({ applicationId: { $in: appIds } })
    await (await folders()).deleteMany({ applicationId: { $in: appIds } })
    await (await applications()).deleteMany({ userId: id })
  }
  await (await supportTickets()).deleteMany({ userId: id })
  await (await users()).deleteOne({ id })

  return { filePublicIds }
}

/* ------------------------------ Applications ------------------------------ */

/** Applications predating the archive feature have no `archivedAt` field. */
function normalizeApplication(raw: VisaApplication): VisaApplication {
  return { ...raw, archivedAt: raw.archivedAt ?? null }
}

export async function listApplications(userId: string): Promise<VisaApplication[]> {
  const apps = await (await applications()).find({ userId }, NO_ID).sort({ createdAt: 1 }).toArray()
  return apps.map(normalizeApplication)
}

export async function getApplication(userId: string, id: string): Promise<VisaApplication | undefined> {
  const doc = await (await applications()).findOne({ id, userId }, NO_ID)
  return doc ? normalizeApplication(doc) : undefined
}

/** Archives or restores an application. Archived ones stay fully intact. */
export async function setApplicationArchived(
  userId: string,
  id: string,
  archived: boolean,
): Promise<VisaApplication | undefined> {
  const app = await getApplication(userId, id)
  if (!app) return undefined
  const archivedAt = archived ? new Date().toISOString() : null
  const result = await (await applications()).findOneAndUpdate(
    { id, userId },
    { $set: { archivedAt } },
    { returnDocument: "after", projection: { _id: 0 } },
  )
  return result ? normalizeApplication(result) : undefined
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
    archivedAt: null,
    createdAt: new Date().toISOString(),
  }
  await (await applications()).insertOne({ ...app })
  return app
}

/**
 * Deletes an application with its documents and folders. Returns the public
 * ids of any uploaded files so the caller can clear them from Cloudinary.
 */
export async function deleteApplication(
  userId: string,
  id: string,
): Promise<{ filePublicIds: string[] } | null> {
  const app = await getApplication(userId, id)
  if (!app) return null

  const ownedDocs = await (await documents()).find({ applicationId: id }, NO_ID).toArray()
  const filePublicIds = ownedDocs.flatMap((d) =>
    normalizeDocument(d)
      .files.map((f) => f.publicId)
      .filter(Boolean),
  )

  await (await applications()).deleteOne({ id })
  await (await documents()).deleteMany({ applicationId: id })
  await (await folders()).deleteMany({ applicationId: id })
  return { filePublicIds }
}

/* --------------------------------- Folders -------------------------------- */

export async function listFolders(applicationId: string): Promise<VisaFolder[]> {
  return (await folders()).find({ applicationId }, NO_ID).sort({ createdAt: 1 }).toArray()
}

export async function getFolder(id: string): Promise<VisaFolder | undefined> {
  const folder = await (await folders()).findOne({ id }, NO_ID)
  return folder ?? undefined
}

export async function createFolder(input: { applicationId: string; name: string }): Promise<VisaFolder> {
  const folder: VisaFolder = {
    id: randomUUID(),
    applicationId: input.applicationId,
    name: input.name,
    createdAt: new Date().toISOString(),
  }
  await (await folders()).insertOne({ ...folder })
  return folder
}

export async function renameFolder(id: string, name: string): Promise<VisaFolder | undefined> {
  const result = await (await folders()).findOneAndUpdate(
    { id },
    { $set: { name } },
    { returnDocument: "after", projection: { _id: 0 } },
  )
  return result ?? undefined
}

/**
 * Deleting a folder never deletes documents — they fall back to the
 * application root, which is exactly where they'd be without folders at all.
 */
export async function deleteFolder(id: string): Promise<boolean> {
  await (await documents()).updateMany({ folderId: id }, { $set: { folderId: null } })
  const result = await (await folders()).deleteOne({ id })
  return result.deletedCount > 0
}

/* -------------------------------- Documents ------------------------------- */

/**
 * Folds two pre-existing shapes forward: documents written before multi-file
 * support carry a single `fileUrl`/`filePublicId`/... set instead of a `files`
 * array, and documents written before folders have no `folderId` at all. Both
 * are normalized on read so nothing already stored is orphaned.
 */
function normalizeDocument(raw: VisaDocument): VisaDocument {
  const folderId = raw.folderId ?? null
  const manualComplete = raw.manualComplete ?? false
  if (Array.isArray(raw.files)) return { ...raw, folderId, manualComplete }
  const legacy = raw as unknown as {
    fileUrl?: string | null
    filePublicId?: string | null
    fileName?: string | null
    fileFormat?: string | null
    uploadedAt?: string | null
  }
  const files: VisaFile[] = legacy.fileUrl
    ? [
        {
          id: legacy.filePublicId ?? randomUUID(),
          url: legacy.fileUrl,
          publicId: legacy.filePublicId ?? "",
          name: legacy.fileName ?? raw.name,
          format: legacy.fileFormat ?? "",
          uploadedAt: legacy.uploadedAt ?? raw.createdAt,
        },
      ]
    : []
  return { ...raw, folderId, manualComplete, files }
}

/**
 * A document counts as complete once it has a file on record, or when the user
 * ticked it off by hand because the only copy they hold is a physical one.
 */
function statusOf(files: VisaFile[], manualComplete: boolean): DocumentStatus {
  return files.length > 0 || manualComplete ? "uploaded" : "pending"
}

export async function listDocuments(applicationId: string): Promise<VisaDocument[]> {
  const docs = await (await documents()).find({ applicationId }, NO_ID).sort({ createdAt: 1 }).toArray()
  return docs.map(normalizeDocument)
}

export async function getDocument(id: string): Promise<VisaDocument | undefined> {
  const doc = await (await documents()).findOne({ id }, NO_ID)
  return doc ? normalizeDocument(doc) : undefined
}

export async function createDocument(input: {
  applicationId: string
  name: string
  description?: string
  category?: string | null
  folderId?: string | null
  deadline?: string | null
}): Promise<VisaDocument> {
  const doc: VisaDocument = {
    id: randomUUID(),
    applicationId: input.applicationId,
    name: input.name,
    description: input.description ?? "",
    category: input.category ?? null,
    folderId: input.folderId ?? null,
    deadline: input.deadline ?? null,
    status: "pending",
    manualComplete: false,
    files: [],
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
  return result ? normalizeDocument(result) : undefined
}

/** Appends newly uploaded files and marks the document as having files on record. */
export async function addDocumentFiles(id: string, files: VisaFile[]): Promise<VisaDocument | undefined> {
  const document = await getDocument(id)
  if (!document) return undefined
  const result = await (await documents()).findOneAndUpdate(
    { id },
    { $set: { files: [...document.files, ...files], status: "uploaded" } },
    { returnDocument: "after", projection: { _id: 0 } },
  )
  return result ? normalizeDocument(result) : undefined
}

/**
 * Removes one file from a document. It reverts to "pending" once nothing is
 * left — unless the user had also ticked it off by hand.
 */
export async function removeDocumentFile(id: string, fileId: string): Promise<VisaDocument | undefined> {
  const document = await getDocument(id)
  if (!document) return undefined
  const files = document.files.filter((f) => f.id !== fileId)
  const result = await (await documents()).findOneAndUpdate(
    { id },
    { $set: { files, status: statusOf(files, document.manualComplete) } },
    { returnDocument: "after", projection: { _id: 0 } },
  )
  return result ? normalizeDocument(result) : undefined
}

/**
 * Ticks a document off (or back on) by hand. Files still count on their own,
 * so un-ticking a document that has files on record leaves it complete.
 */
export async function setDocumentComplete(
  id: string,
  complete: boolean,
): Promise<VisaDocument | undefined> {
  const document = await getDocument(id)
  if (!document) return undefined
  const result = await (await documents()).findOneAndUpdate(
    { id },
    { $set: { manualComplete: complete, status: statusOf(document.files, complete) } },
    { returnDocument: "after", projection: { _id: 0 } },
  )
  return result ? normalizeDocument(result) : undefined
}

export async function deleteDocument(id: string): Promise<boolean> {
  const result = await (await documents()).deleteOne({ id })
  return result.deletedCount > 0
}

/* ----------------------------- Support tickets ---------------------------- */

export async function createSupportTicket(input: {
  userId: string
  category: SupportCategory
  subject: string
  message: string
}): Promise<SupportTicket> {
  const ticket: SupportTicket = {
    id: randomUUID(),
    userId: input.userId,
    category: input.category,
    subject: input.subject.trim(),
    message: input.message.trim(),
    status: "open",
    createdAt: new Date().toISOString(),
  }
  await (await supportTickets()).insertOne({ ...ticket })
  return ticket
}

export async function listSupportTickets(userId: string): Promise<SupportTicket[]> {
  return (await supportTickets()).find({ userId }, NO_ID).sort({ createdAt: -1 }).toArray()
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
