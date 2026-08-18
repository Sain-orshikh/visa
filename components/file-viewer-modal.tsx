"use client"

import { useEffect, useState } from "react"
import { ExternalLink, File as FileIcon, FileImage, Loader2, Trash2, X } from "lucide-react"
import { api } from "@/lib/api"
import type { VisaDocument, VisaFile } from "@/lib/types"

const IMAGE_FORMATS = ["jpg", "jpeg", "png", "webp", "gif"]

function isImage(format: string) {
  return IMAGE_FORMATS.includes(format.toLowerCase())
}

interface FileViewerModalProps {
  document: VisaDocument
  onClose: () => void
  onChanged: () => void
}

export function FileViewerModal({ document, onClose, onChanged }: FileViewerModalProps) {
  const [files, setFiles] = useState<VisaFile[]>(document.files)
  const [selectedId, setSelectedId] = useState<string | null>(document.files[0]?.id ?? null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  useEffect(() => {
    setFiles(document.files)
    setSelectedId((prev) => (document.files.some((f) => f.id === prev) ? prev : document.files[0]?.id ?? null))
  }, [document.files])

  async function handleDelete(fileId: string) {
    setBusyId(fileId)
    try {
      await api.deleteFile(document.id, fileId)
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
      onChanged()
    } finally {
      setBusyId(null)
    }
  }

  const selected = files.find((f) => f.id === selectedId) ?? null

  if (files.length === 0) {
    onClose()
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-margin-mobile md:p-margin-desktop bg-on-background/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="file-viewer-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface rounded-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden shadow-[0_16px_40px_rgba(16,24,40,0.24)] animate-in fade-in slide-in-from-bottom-4 duration-200"
      >
        <div className="px-gutter py-stack-md border-b border-outline-variant flex justify-between items-start gap-4 shrink-0">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-on-surface-variant mb-1.5">
              {files.length} {files.length === 1 ? "file" : "files"}
            </p>
            <h2 id="file-viewer-title" className="font-display text-xl font-bold text-on-surface truncate">
              {document.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-on-surface-variant hover:text-on-surface p-2 -mr-2 rounded-lg hover:bg-surface-container transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* File picker */}
          <div className="w-56 shrink-0 border-r border-outline-variant overflow-y-auto py-2">
            {files.map((file) => {
              const active = file.id === selectedId
              return (
                <div
                  key={file.id}
                  className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                    active ? "bg-selected" : "hover:bg-surface-container"
                  }`}
                  onClick={() => setSelectedId(file.id)}
                >
                  {isImage(file.format) ? (
                    <FileImage className={`w-4 h-4 shrink-0 ${active ? "text-primary" : "text-on-surface-variant"}`} />
                  ) : (
                    <FileIcon className={`w-4 h-4 shrink-0 ${active ? "text-primary" : "text-on-surface-variant"}`} />
                  )}
                  <span className={`text-xs truncate flex-1 ${active ? "text-primary font-medium" : "text-on-surface"}`}>
                    {file.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(file.id)
                    }}
                    disabled={busyId === file.id}
                    aria-label={`Delete ${file.name}`}
                    className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error transition-opacity shrink-0"
                  >
                    {busyId === file.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Preview */}
          <div className="flex-1 min-w-0 bg-surface-container-low flex flex-col">
            {selected && (
              <>
                <div className="px-4 py-2 border-b border-outline-variant flex items-center justify-between gap-2 shrink-0">
                  <span className="text-xs text-on-surface-variant truncate">{selected.name}</span>
                  <a
                    href={selected.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-xs font-semibold hover:underline flex items-center gap-1 shrink-0"
                  >
                    Open <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="flex-1 min-h-0 flex items-center justify-center p-4">
                  {isImage(selected.format) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selected.url}
                      alt={selected.name}
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                  ) : (
                    <iframe title={selected.name} src={selected.url} className="w-full h-full rounded-lg bg-white" />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
