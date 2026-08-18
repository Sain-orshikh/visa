import type {
  PublicUser,
  StorageProvider,
  StorageSettings,
  SupportCategory,
  SupportTicket,
  UserCategory,
  VisaApplication,
  VisaDocument,
  VisaFolder,
  VisaType,
} from "./types"

export interface ApplicationSummary extends VisaApplication {
  totalDocuments: number
  uploadedDocuments: number
}

export interface ApplicationDetail extends ApplicationSummary {
  progress: number
}

export const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const error = new Error(body.error ?? "Request failed") as Error & { status?: number }
    error.status = res.status
    throw error
  }
  return res.json()
}

async function send<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? "Request failed")
  return data as T
}

export const api = {
  register: (input: { email: string; name: string; password: string }) =>
    send<{ user: { id: string; email: string; name: string } }>("/api/auth/register", "POST", input),
  login: (input: { email: string; password: string }) =>
    send<{ user: { id: string; email: string; name: string } }>("/api/auth/login", "POST", input),
  logout: () => send<{ ok: true }>("/api/auth/logout", "POST"),

  updateProfile: (input: { name?: string; email?: string }) =>
    send<{ user: PublicUser }>("/api/auth/me", "PATCH", input),
  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    send<{ ok: true }>("/api/auth/password", "POST", input),
  deleteAccount: (input: { password: string }) =>
    send<{ ok: true }>("/api/auth/me", "DELETE", input),

  getStorage: () => send<{ storage: StorageSettings }>("/api/storage", "GET"),
  /** Switches provider, optionally saving the Cloudinary credentials with it. */
  updateStorage: (input: {
    provider: StorageProvider
    cloudinary?: { cloudName: string; apiKey: string; apiSecret: string }
  }) => send<{ storage: StorageSettings }>("/api/storage", "PUT", input),
  disconnectStorage: (target: "cloudinary" | "google-drive") =>
    send<{ storage: StorageSettings }>("/api/storage", "DELETE", { target }),
  /** Returns the Google consent URL for the browser to navigate to. */
  startGoogleDriveConnect: () => send<{ authUrl: string }>("/api/storage/google", "GET"),

  createSupportTicket: (input: { category: SupportCategory; subject: string; message: string }) =>
    send<{ ticket: SupportTicket }>("/api/support", "POST", input),

  createApplication: (input: {
    name?: string
    destinationCountry: string
    visaType: VisaType
    travelDate?: string | null
    applicationCenter?: string | null
    applicantName?: string | null
    notes?: string | null
  }) => send<{ application: VisaApplication }>("/api/applications", "POST", input),
  deleteApplication: (id: string) => send<{ ok: true }>(`/api/applications/${id}`, "DELETE"),
  setApplicationArchived: (id: string, archived: boolean) =>
    send<{ application: VisaApplication }>(`/api/applications/${id}`, "PATCH", { archived }),

  listCategories: () => send<{ categories: UserCategory[] }>("/api/categories", "GET"),
  createCategory: (label: string) =>
    send<{ categories: UserCategory[] }>("/api/categories", "POST", { label }),
  deleteCategory: (id: string) => send<{ categories: UserCategory[] }>("/api/categories", "DELETE", { id }),

  createFolder: (applicationId: string, name: string) =>
    send<{ folder: VisaFolder }>(`/api/applications/${applicationId}/folders`, "POST", { name }),
  renameFolder: (id: string, name: string) =>
    send<{ folder: VisaFolder }>(`/api/folders/${id}`, "PATCH", { name }),
  deleteFolder: (id: string) => send<{ ok: true }>(`/api/folders/${id}`, "DELETE"),

  createDocument: (
    applicationId: string,
    input: {
      name: string
      description?: string
      category?: string | null
      folderId?: string | null
      deadline?: string | null
    },
  ) => send<{ document: VisaDocument }>(`/api/applications/${applicationId}/documents`, "POST", input),
  updateDocument: (
    id: string,
    input: {
      deadline?: string | null
      name?: string
      description?: string
      category?: string | null
      folderId?: string | null
    },
  ) => send<{ document: VisaDocument }>(`/api/documents/${id}`, "PATCH", input),
  /** Ticks a document off by hand — for the ones that only exist on paper. */
  setDocumentComplete: (id: string, complete: boolean) =>
    send<{ document: VisaDocument }>(`/api/documents/${id}`, "PATCH", { complete }),
  deleteDocument: (id: string) => send<{ ok: true }>(`/api/documents/${id}`, "DELETE"),

  uploadFile: async (documentId: string, files: File | File[]) => {
    const formData = new FormData()
    for (const file of Array.isArray(files) ? files : [files]) {
      formData.append("file", file)
    }
    const res = await fetch(`/api/documents/${documentId}/upload`, { method: "POST", body: formData })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? "Upload failed")
    return data as { document: VisaDocument }
  },
  deleteFile: (documentId: string, fileId: string) =>
    send<{ document: VisaDocument }>(`/api/documents/${documentId}/files/${fileId}`, "DELETE"),
}
