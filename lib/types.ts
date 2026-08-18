export type VisaType = "tourist" | "work" | "student"

export type DocumentStatus = "pending" | "uploaded"

/** A category the user defined themselves, alongside the built-in ones. */
export interface UserCategory {
  id: string
  label: string
}

export interface User {
  id: string
  email: string
  name: string
  passwordHash: string
  /** Absent on accounts created before custom categories existed. */
  categories?: UserCategory[]
  createdAt: string
}

export interface VisaApplication {
  id: string
  userId: string
  name: string
  destinationCountry: string
  visaType: VisaType
  travelDate: string | null
  applicationCenter: string | null
  applicantName: string | null
  notes: string | null
  /** Set when the user archives the application; null while it's active. */
  archivedAt: string | null
  createdAt: string
}

/**
 * An optional grouping layer inside one application. Applications with no
 * folders keep the flat, category-grouped checklist they've always had.
 */
export interface VisaFolder {
  id: string
  applicationId: string
  name: string
  createdAt: string
}

export interface VisaFile {
  id: string
  url: string
  publicId: string
  name: string
  format: string
  uploadedAt: string
}

export interface VisaDocument {
  id: string
  applicationId: string
  name: string
  description: string
  category: string | null
  /** null means the document sits at the application root, outside any folder. */
  folderId: string | null
  deadline: string | null
  status: DocumentStatus
  /**
   * Ticked by hand for documents that only exist on paper. It keeps the
   * document complete on its own, and survives files being added or removed.
   */
  manualComplete: boolean
  files: VisaFile[]
  createdAt: string
}

export type SupportCategory = "documents" | "account" | "billing" | "bug" | "other"

export type SupportStatus = "open" | "closed"

export interface SupportTicket {
  id: string
  userId: string
  category: SupportCategory
  subject: string
  message: string
  status: SupportStatus
  createdAt: string
}

/** Shape returned to the client (never includes password hashes). */
export interface PublicUser {
  id: string
  email: string
  name: string
}
