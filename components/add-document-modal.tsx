"use client"

import { useEffect, useState } from "react"
import { CalendarDays, ChevronDown, FileText, Folder, PlusCircle, X } from "lucide-react"
import { api } from "@/lib/api"

interface AddDocumentModalProps {
  applicationId: string
  onClose: () => void
  onAdded: () => void
}

const FIELD =
  "w-full py-3 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface text-sm placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"

export function AddDocumentModal({ applicationId, onClose, onAdded }: AddDocumentModalProps) {
  const [name, setName] = useState("")
  const [deadline, setDeadline] = useState("")
  const [category, setCategory] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Escape closes the dialog, matching the overlay click.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError("Enter a name for the document.")
      return
    }
    setError(null)
    setSaving(true)
    try {
      await api.createDocument(applicationId, {
        name: name.trim(),
        description: notes.trim(),
        category: category || null,
        deadline: deadline || null,
      })
      onAdded()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add document.")
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-margin-mobile md:p-margin-desktop bg-on-background/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-doc-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface rounded-xl w-full max-w-2xl flex flex-col max-h-full overflow-hidden shadow-[0_16px_40px_rgba(16,24,40,0.24)] animate-in fade-in slide-in-from-bottom-4 duration-200"
      >
        {/* Header */}
        <div className="px-gutter py-stack-md border-b border-outline-variant flex justify-between items-start gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-on-surface-variant mb-1.5">
              Checklist
            </p>
            <h2 id="add-doc-title" className="font-display text-xl font-bold text-on-surface">
              Add a document
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-on-surface-variant hover:text-on-surface p-2 -mr-2 rounded-lg hover:bg-surface-container transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-gutter overflow-y-auto flex flex-col gap-stack-md">
          <div className="flex flex-col gap-stack-sm">
            <label htmlFor="doc-name" className="text-sm font-semibold text-on-surface">
              Document name
            </label>
            <div className="relative">
              <FileText className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
              <input
                id="doc-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bank statement, last 6 months"
                className={`${FIELD} pl-10 pr-4`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            <div className="flex flex-col gap-stack-sm">
              <label htmlFor="doc-deadline" className="text-sm font-semibold text-on-surface">
                Deadline
              </label>
              <div className="relative">
                <CalendarDays className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
                <input
                  id="doc-deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className={`${FIELD} pl-10 pr-4 font-mono`}
                />
              </div>
            </div>

            <div className="flex flex-col gap-stack-sm">
              <label htmlFor="doc-type" className="text-sm font-semibold text-on-surface">
                Category
              </label>
              <div className="relative">
                <Folder className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
                <select
                  id="doc-type"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`${FIELD} pl-10 pr-10 appearance-none cursor-pointer`}
                >
                  <option value="">Other</option>
                  <option value="identity">Identity</option>
                  <option value="financial">Financial</option>
                  <option value="travel">Travel</option>
                </select>
                <ChevronDown className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
              </div>
              <p className="text-xs text-on-surface-variant">Groups the document in your checklist.</p>
            </div>
          </div>

          <div className="flex flex-col gap-stack-sm">
            <label htmlFor="doc-notes" className="text-sm font-semibold text-on-surface flex justify-between">
              <span>Notes</span>
              <span className="text-on-surface-variant font-normal">Optional</span>
            </label>
            <textarea
              id="doc-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Requirements to remember — validity period, number of copies, translation…"
              className={`${FIELD} px-4 resize-none`}
            />
          </div>

          {error && (
            <p className="text-sm text-on-error-container bg-error-container rounded-lg px-3 py-2" role="alert">
              {error}
            </p>
          )}

          {/* Footer */}
          <div className="-mx-gutter -mb-gutter mt-stack-sm px-gutter py-stack-md border-t border-outline-variant bg-surface-container-low flex justify-end gap-stack-sm">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-on-surface-variant text-sm font-semibold hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              <PlusCircle className="w-4 h-4" />
              {saving ? "Adding…" : "Add document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
