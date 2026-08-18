export type VisaType = "tourist" | "work" | "student"

export type DocumentStatus = "pending" | "uploaded"

/** A category the user defined themselves, alongside the built-in ones. */
export interface UserCategory {
  id: string
  label: string
}

/* -------------------------------- Storage --------------------------------- */

/**
 * Where a user's uploaded files live. "app" is the shared storage this
 * deployment provides; the others are the user's own account, so their
 * documents never touch our storage at all.
 */
export type StorageProvider = "app" | "cloudinary" | "google-drive"

export interface CloudinaryCredentials {
  cloudName: string
  apiKey: string
  /** Encrypted at rest — see lib/secrets.ts. */
  apiSecret: string
}

export interface GoogleDriveCredentials {
  /** Encrypted at rest — see lib/secrets.ts. */
  refreshToken: string
  /** The Drive folder we create and upload into. */
  folderId: string | null
  /** Shown in settings so the user knows which account is connected. */
  accountEmail: string | null
}

export interface UserStorage {
  provider: StorageProvider
  cloudinary?: CloudinaryCredentials
  googleDrive?: GoogleDriveCredentials
}

/** Storage state as the settings page sees it — never includes secrets. */
export interface StorageSettings {
  provider: StorageProvider
  /** False when the deployment has no shared storage configured. */
  appStorageAvailable: boolean
  /** False when the deployment has no Google OAuth client configured. */
  googleDriveAvailable: boolean
  cloudinary: { cloudName: string; apiKey: string } | null
  googleDrive: { accountEmail: string | null; folderId: string | null } | null
}

export interface User {
  id: string
  email: string
  name: string
  passwordHash: string
  /** Absent on accounts created before custom categories existed. */
  categories?: UserCategory[]
  /** Absent while the user is still on this deployment's shared storage. */
  storage?: UserStorage
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
  /**
   * Where to load the file from. Cloudinary files carry their delivery URL;
   * Google Drive files point at our own streaming route, since Drive uploads
   * stay private to the user's account.
   */
  url: string
  publicId: string
  /** Absent on files uploaded before per-user storage existed — treat as "app". */
  provider?: StorageProvider
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
