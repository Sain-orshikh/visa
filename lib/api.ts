import type { VisaApplication, VisaDocument, VisaType } from "./types"

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

  createApplication: (input: {
    name?: string
    destinationCountry: string
    visaType: VisaType
    travelDate?: string | null
    applicationCenter?: string | null
  }) => send<{ application: VisaApplication }>("/api/applications", "POST", input),
  deleteApplication: (id: string) => send<{ ok: true }>(`/api/applications/${id}`, "DELETE"),

  createDocument: (
    applicationId: string,
    input: { name: string; description?: string; category?: string | null; deadline?: string | null },
  ) => send<{ document: VisaDocument }>(`/api/applications/${applicationId}/documents`, "POST", input),
  updateDocument: (id: string, input: { deadline?: string | null; name?: string; description?: string }) =>
    send<{ document: VisaDocument }>(`/api/documents/${id}`, "PATCH", input),
  deleteDocument: (id: string) => send<{ ok: true }>(`/api/documents/${id}`, "DELETE"),

  uploadFile: async (documentId: string, file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch(`/api/documents/${documentId}/upload`, { method: "POST", body: formData })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? "Upload failed")
    return data as { document: VisaDocument }
  },
}
