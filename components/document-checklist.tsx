"use client"

import { useRef, useState } from "react"
import {
  CalendarDays,
  ChevronDown,
  CircleCheck,
  Clock,
  CloudUpload,
  Eye,
  FileText,
  IdCard,
  Landmark,
  Loader2,
  Plane,
  Trash2,
} from "lucide-react"
import { api } from "@/lib/api"
import type { VisaDocument } from "@/lib/types"

/* ---------------------------------------------------------------- urgency */

type Urgency = "overdue" | "today" | "soon" | "scheduled" | "none"

interface Deadline {
  level: Urgency
  label: string
  /** Days from today. Negative when overdue, Infinity when unset — sorts naturally. */
  days: number
}

function urgencyOf(deadline: string | null): Deadline {
  if (!deadline) return { level: "none", label: "No deadline", days: Number.POSITIVE_INFINITY }

  const date = new Date(deadline + "T00:00:00")
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((date.getTime() - today.getTime()) / 86400000)
  const plural = (n: number) => (n === 1 ? "day" : "days")

  if (days < 0) return { level: "overdue", label: `${Math.abs(days)} ${plural(Math.abs(days))} overdue`, days }
  if (days === 0) return { level: "today", label: "Due today", days }
  if (days <= 7) return { level: "soon", label: `Due in ${days} ${plural(days)}`, days }
  return {
    level: "scheduled",
    label: `Due ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
    days,
  }
}

/** Urgency is carried by a leading rail so it reads down the whole column. */
const RAIL: Record<Urgency, string> = {
  overdue: "border-l-error",
  today: "border-l-error",
  soon: "border-l-warning",
  scheduled: "border-l-outline-variant",
  none: "border-l-outline-variant",
}

/** A deadline that matters is a filled chip; one that doesn't stays quiet. */
const CHIP: Record<Urgency, string> = {
  overdue: "bg-error text-on-error font-semibold",
  today: "bg-error text-on-error font-semibold",
  soon: "bg-warning-container text-on-warning-container font-semibold",
  scheduled: "bg-surface-container text-on-surface-variant",
  none: "bg-surface-container text-on-surface-variant",
}

/* ------------------------------------------------------------- categories */

const CATEGORIES = [
  { key: "identity", label: "Identity", Icon: IdCard },
  { key: "financial", label: "Financial", Icon: Landmark },
  { key: "travel", label: "Travel", Icon: Plane },
  { key: "other", label: "Other", Icon: FileText },
] as const

function categoryKey(document: VisaDocument): string {
  const raw = (document.category ?? "").toLowerCase()
  return CATEGORIES.some((c) => c.key === raw && raw !== "other") ? raw : "other"
}

/* -------------------------------------------------------------------- row */

interface DocumentRowProps {
  document: VisaDocument
  onChanged: () => void
}

function OutstandingRow({ document, onChanged }: DocumentRowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingDeadline, setEditingDeadline] = useState(false)

  const deadline = urgencyOf(document.deadline)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      await api.uploadFile(document.id, file)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleDelete() {
    setBusy(true)
    try {
      await api.deleteDocument(document.id)
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  async function handleDeadline(value: string) {
    setEditingDeadline(false)
    setBusy(true)
    try {
      await api.updateDocument(document.id, { deadline: value || null })
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`group flex flex-col md:flex-row md:items-center gap-4 rounded-lg border border-outline-variant border-l-4 ${RAIL[deadline.level]} bg-surface px-5 py-4 transition-shadow duration-200 hover:shadow-[0_2px_10px_rgba(16,24,40,0.07)]`}
    >
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <Circle />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold text-on-surface leading-snug">
            {document.name}
          </h3>
          {document.description && (
            <p className="text-sm text-on-surface-variant mt-1 text-pretty">{document.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-3">
            {editingDeadline ? (
              <input
                type="date"
                autoFocus
                defaultValue={document.deadline ?? ""}
                onBlur={(e) => handleDeadline(e.target.value)}
                onChange={(e) => handleDeadline(e.target.value)}
                className="font-mono text-xs px-2 py-1.5 rounded-md border border-outline-variant bg-surface-container-low text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            ) : document.deadline ? (
              <button
                onClick={() => setEditingDeadline(true)}
                className={`font-mono inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md transition-opacity hover:opacity-80 ${CHIP[deadline.level]}`}
              >
                <Clock className="w-3.5 h-3.5" />
                {deadline.label}
              </button>
            ) : (
              <button
                onClick={() => setEditingDeadline(true)}
                className="font-mono inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border border-dashed border-outline text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Set deadline
              </button>
            )}
          </div>

          {error && (
            <p className="text-xs text-error mt-2" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 flex-shrink-0">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-primary-container transition-colors disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
          {busy ? "Uploading…" : "Upload file"}
        </button>
        <button
          onClick={handleDelete}
          disabled={busy}
          title={`Remove ${document.name}`}
          aria-label={`Remove ${document.name}`}
          className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container rounded-lg transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
          onChange={handleFile}
          className="hidden"
        />
      </div>
    </div>
  )
}

/** Empty ring, drawn to match the filled check on the on-file rows. */
function Circle() {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 w-5 h-5 rounded-full border-2 border-outline flex-shrink-0"
    />
  )
}

/** Completed work is dense and quiet — it shouldn't compete with what's left. */
function OnFileRow({ document, onChanged }: DocumentRowProps) {
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    setBusy(true)
    try {
      await api.deleteDocument(document.id)
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2.5">
      <CircleCheck className="w-5 h-5 text-success flex-shrink-0" />
      <span className="text-sm text-on-surface truncate flex-1 min-w-0">{document.name}</span>
      {document.uploadedAt && (
        <span className="font-mono text-[11px] text-on-surface-variant hidden sm:inline">
          {new Date(document.uploadedAt).toLocaleDateString(undefined, {
            day: "2-digit",
            month: "short",
          })}
        </span>
      )}
      <a
        href={document.fileUrl ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="px-2.5 py-1.5 text-primary text-xs font-semibold hover:bg-surface-container rounded-md transition-colors flex items-center gap-1.5"
      >
        <Eye className="w-4 h-4" />
        <span className="hidden sm:inline">View</span>
      </a>
      <button
        onClick={handleDelete}
        disabled={busy}
        title={`Remove ${document.name}`}
        aria-label={`Remove ${document.name}`}
        className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container rounded-md transition-colors disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>
    </div>
  )
}

/* -------------------------------------------------------------- checklist */

interface DocumentChecklistProps {
  documents: VisaDocument[]
  onChanged: () => void
}

export function DocumentChecklist({ documents, onChanged }: DocumentChecklistProps) {
  const [showOnFile, setShowOnFile] = useState(true)

  if (documents.length === 0) {
    return (
      <div className="border border-dashed border-outline rounded-xl px-6 py-12 text-center bg-surface-container-low">
        <p className="text-sm text-on-surface-variant">
          Your checklist is empty. Add the first document you need to collect.
        </p>
      </div>
    )
  }

  const outstanding = documents.filter((d) => d.status !== "uploaded")
  const onFile = documents.filter((d) => d.status === "uploaded")

  // Group what's left by category, most urgent first inside each group.
  const groups = CATEGORIES.map(({ key, label, Icon }) => ({
    key,
    label,
    Icon,
    items: outstanding
      .filter((d) => categoryKey(d) === key)
      .sort((a, b) => urgencyOf(a.deadline).days - urgencyOf(b.deadline).days),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="flex flex-col gap-stack-lg">
      {groups.map(({ key, label, Icon, items }) => (
        <section key={key} className="flex flex-col gap-stack-sm">
          <header className="flex items-center gap-2.5 px-1">
            <Icon className="w-4 h-4 text-on-surface-variant" />
            <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">
              {label}
            </h3>
            <span className="font-mono text-[11px] text-outline">{items.length}</span>
            <span className="flex-1 h-px bg-outline-variant" />
          </header>
          <div className="flex flex-col gap-2">
            {items.map((doc) => (
              <OutstandingRow key={doc.id} document={doc} onChanged={onChanged} />
            ))}
          </div>
        </section>
      ))}

      {outstanding.length === 0 && (
        <div className="rounded-xl border border-success/30 bg-success-container px-6 py-8 text-center">
          <CircleCheck className="w-7 h-7 text-success mx-auto mb-3" />
          <h3 className="font-display text-lg font-semibold text-on-success-container">
            Every document is on file
          </h3>
          <p className="text-sm text-on-success-container/80 mt-1">
            Review your pack, then take it to your application centre.
          </p>
        </div>
      )}

      {onFile.length > 0 && (
        <section className="flex flex-col gap-stack-sm">
          <button
            onClick={() => setShowOnFile((v) => !v)}
            aria-expanded={showOnFile}
            className="flex items-center gap-2.5 px-1 text-left group"
          >
            <CircleCheck className="w-4 h-4 text-success" />
            <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">
              On file
            </h3>
            <span className="font-mono text-[11px] text-outline">{onFile.length}</span>
            <span className="flex-1 h-px bg-outline-variant" />
            <ChevronDown
              className={`w-4 h-4 text-on-surface-variant transition-transform duration-200 ${
                showOnFile ? "" : "-rotate-90"
              }`}
            />
          </button>
          {showOnFile && (
            <div className="flex flex-col gap-1.5">
              {onFile.map((doc) => (
                <OnFileRow key={doc.id} document={doc} onChanged={onChanged} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
