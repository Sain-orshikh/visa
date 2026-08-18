"use client"

import { useState } from "react"
import { X, FileText, CalendarDays, Folder, ChevronDown, PlusCircle } from "lucide-react"
import { api } from "@/lib/api"

interface AddDocumentModalProps {
  applicationId: string
  onClose: () => void
  onAdded: () => void
}

export function AddDocumentModal({ applicationId, onClose, onAdded }: AddDocumentModalProps) {
  const [name, setName] = useState("")
  const [deadline, setDeadline] = useState("")
  const [category, setCategory] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError("Please enter a document name.")
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
      className="fixed inset-0 z-50 flex items-center justify-center p-margin-mobile md:p-margin-desktop bg-on-background/20 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-doc-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface rounded-xl w-full max-w-2xl flex flex-col max-h-full overflow-hidden shadow-[0_12px_24px_rgba(9,30,66,0.15)] animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        {/* Header */}
        <div className="px-gutter py-stack-md border-b border-outline-variant flex justify-between items-start bg-surface-bright">
          <div>
            <h2 id="add-doc-title" className="text-2xl font-semibold text-on-surface">
              Add New Document
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">Add a required item to your checklist.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-on-surface-variant hover:text-error p-2 rounded-full hover:bg-error-container/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-gutter overflow-y-auto flex flex-col gap-stack-md">
          <div className="flex flex-col gap-stack-sm">
            <label htmlFor="doc-name" className="text-xs font-semibold uppercase tracking-wide text-on-surface">
              Document Name
            </label>
            <div className="relative">
              <FileText className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
              <input
                id="doc-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bank Statement (Last 6 Months)"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-outline-variant bg-surface text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            <div className="flex flex-col gap-stack-sm">
              <label htmlFor="doc-deadline" className="text-xs font-semibold uppercase tracking-wide text-on-surface">
                Target Deadline
              </label>
              <div className="relative">
                <CalendarDays className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
                <input
                  id="doc-deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-outline-variant bg-surface text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-stack-sm">
              <label htmlFor="doc-type" className="text-xs font-semibold uppercase tracking-wide text-on-surface">
                Category
              </label>
              <div className="relative">
                <Folder className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
                <select
                  id="doc-type"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-lg border border-outline-variant bg-surface text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select category…</option>
                  <option value="financial">Financial</option>
                  <option value="identity">Identity</option>
                  <option value="travel">Travel Itinerary</option>
                </select>
                <ChevronDown className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-stack-sm">
            <label htmlFor="doc-notes" className="text-xs font-semibold uppercase tracking-wide text-on-surface flex justify-between">
              <span>Description / Notes</span>
              <span className="text-on-surface-variant font-normal normal-case tracking-normal">Optional</span>
            </label>
            <textarea
              id="doc-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any specific instructions or details for this document…"
              className="w-full p-4 rounded-lg border border-outline-variant bg-surface text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-on-error-container bg-error-container rounded-lg px-3 py-2" role="alert">
              {error}
            </p>
          )}

          {/* Footer */}
          <div className="-mx-gutter -mb-gutter mt-stack-sm px-gutter py-stack-md border-t border-outline-variant bg-surface flex justify-end gap-stack-md">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg text-primary text-sm font-semibold hover:bg-primary/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2 disabled:opacity-60"
            >
              <PlusCircle className="w-4 h-4" />
              {saving ? "Adding…" : "Add Document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
