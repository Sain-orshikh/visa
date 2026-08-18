export type VisaType = "tourist" | "work" | "student"

export type DocumentStatus = "pending" | "uploaded"

export interface User {
  id: string
  email: string
  name: string
  passwordHash: string
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
  createdAt: string
}

export interface VisaDocument {
  id: string
  applicationId: string
  name: string
  description: string
  category: string | null
  deadline: string | null
  status: DocumentStatus
  fileUrl: string | null
  filePublicId: string | null
  fileName: string | null
  fileFormat: string | null
  uploadedAt: string | null
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
