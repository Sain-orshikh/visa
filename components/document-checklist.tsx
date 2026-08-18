"use client"

import { useEffect, useRef, useState } from "react"
import {
  CalendarDays,
  Check,
  ChevronDown,
  CircleCheck,
  Clock,
  CloudUpload,
  Ellipsis,
  Eye,
  FolderOpen,
  FolderPlus,
  GripVertical,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react"
import { api } from "@/lib/api"
import { categoryKeyOf, type CategoryOption } from "@/lib/categories"
import type { VisaDocument, VisaFolder } from "@/lib/types"
import { FileViewerModal } from "@/components/file-viewer-modal"
import { DocumentModal } from "@/components/document-modal"

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

/* ------------------------------------------------------------- shared bits */

/** Drag payload key. Kept narrow so unrelated drags (files, text) are ignored. */
const DRAG_TYPE = "application/x-visa-document"

interface RowActions {
  folders: VisaFolder[]
  onEdit: (document: VisaDocument) => void
  onMove: (documentId: string, folderId: string | null) => void
  onDragStart: (documentId: string) => void
  onDragEnd: () => void
}

/**
 * Per-row overflow menu: edit, move between folders, delete. Everything the
 * drag-and-drop affords is reachable here too, for touch and keyboard.
 */
function RowMenu({
  document: doc,
  actions,
  onDelete,
  busy,
}: {
  document: VisaDocument
  actions: RowActions
  onDelete: () => void
  busy: boolean
}) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    window.document.addEventListener("mousedown", onClickOutside)
    window.addEventListener("keydown", onKey)
    return () => {
      window.document.removeEventListener("mousedown", onClickOutside)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  const otherFolders = actions.folders.filter((f) => f.id !== doc.folderId)

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${doc.name}`}
        className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors disabled:opacity-50"
      >
        <Ellipsis className="w-4 h-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-20 w-52 bg-surface border border-outline-variant rounded-lg shadow-[0_8px_24px_rgba(16,24,40,0.16)] py-1 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false)
              actions.onEdit(doc)
            }}
            className="w-full text-left px-3 py-2 text-sm text-on-surface hover:bg-surface-container transition-colors flex items-center gap-2.5"
          >
            <Pencil className="w-4 h-4 text-on-surface-variant" />
            Edit details
          </button>

          {(otherFolders.length > 0 || doc.folderId) && (
            <>
              <div className="px-3 pt-2 pb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
                Move to
              </div>
              {doc.folderId && (
                <button
                  role="menuitem"
                  onClick={() => {
                    setOpen(false)
                    actions.onMove(doc.id, null)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-on-surface hover:bg-surface-container transition-colors flex items-center gap-2.5"
                >
                  <FolderOpen className="w-4 h-4 text-on-surface-variant" />
                  No folder
                </button>
              )}
              {otherFolders.map((folder) => (
                <button
                  key={folder.id}
                  role="menuitem"
                  onClick={() => {
                    setOpen(false)
                    actions.onMove(doc.id, folder.id)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-on-surface hover:bg-surface-container transition-colors flex items-center gap-2.5"
                >
                  <FolderOpen className="w-4 h-4 text-on-surface-variant" />
                  <span className="truncate">{folder.name}</span>
                </button>
              ))}
            </>
          )}

          <div className="my-1 h-px bg-outline-variant" />
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
            className="w-full text-left px-3 py-2 text-sm text-error hover:bg-error-container transition-colors flex items-center gap-2.5"
          >
            <Trash2 className="w-4 h-4" />
            Delete document
          </button>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------- row */

interface DocumentRowProps {
  document: VisaDocument
  actions: RowActions
  onChanged: () => void
}

function OutstandingRow({ document: doc, actions, onChanged }: DocumentRowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingDeadline, setEditingDeadline] = useState(false)

  const deadline = urgencyOf(doc.deadline)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setError(null)
    setBusy(true)
    try {
      await api.uploadFile(doc.id, files)
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
      await api.deleteDocument(doc.id)
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  async function handleDeadline(value: string) {
    setEditingDeadline(false)
    setBusy(true)
    try {
      await api.updateDocument(doc.id, { deadline: value || null })
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TYPE, doc.id)
        e.dataTransfer.effectAllowed = "move"
        actions.onDragStart(doc.id)
      }}
      onDragEnd={actions.onDragEnd}
      className={`group flex flex-col md:flex-row md:items-center gap-4 rounded-lg border border-outline-variant border-l-4 ${RAIL[deadline.level]} bg-surface px-5 py-4 transition-shadow duration-200 hover:shadow-[0_2px_10px_rgba(16,24,40,0.07)]`}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <GripVertical
          aria-hidden="true"
          className="w-4 h-4 mt-1 text-outline-variant opacity-0 group-hover:opacity-100 transition-opacity cursor-grab shrink-0"
        />
        <Circle />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold text-on-surface leading-snug">{doc.name}</h3>
          {doc.description && (
            <p className="text-sm text-on-surface-variant mt-1 text-pretty">{doc.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-3">
            {editingDeadline ? (
              <input
                type="date"
                autoFocus
                defaultValue={doc.deadline ?? ""}
                onBlur={(e) => handleDeadline(e.target.value)}
                onChange={(e) => handleDeadline(e.target.value)}
                className="font-mono text-xs px-2 py-1.5 rounded-md border border-outline-variant bg-surface-container-low text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            ) : doc.deadline ? (
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

      <div className="flex items-center justify-end gap-1 shrink-0">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-primary-container transition-colors disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
          {busy ? "Uploading…" : "Upload files"}
        </button>
        <RowMenu document={doc} actions={actions} onDelete={handleDelete} busy={busy} />
        <input
          ref={fileInputRef}
          type="file"
          multiple
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
  return <span aria-hidden="true" className="mt-0.5 w-5 h-5 rounded-full border-2 border-outline shrink-0" />
}

/** Completed work is dense and quiet — it shouldn't compete with what's left. */
function OnFileRow({ document: doc, actions, onChanged }: DocumentRowProps) {
  const [busy, setBusy] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)

  const latestUpload = doc.files.reduce<string | null>(
    (latest, f) => (!latest || f.uploadedAt > latest ? f.uploadedAt : latest),
    null,
  )

  async function handleDelete() {
    setBusy(true)
    try {
      await api.deleteDocument(doc.id)
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(DRAG_TYPE, doc.id)
          e.dataTransfer.effectAllowed = "move"
          actions.onDragStart(doc.id)
        }}
        onDragEnd={actions.onDragEnd}
        className="group flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2.5"
      >
        <GripVertical
          aria-hidden="true"
          className="w-4 h-4 text-outline-variant opacity-0 group-hover:opacity-100 transition-opacity cursor-grab shrink-0"
        />
        <CircleCheck className="w-5 h-5 text-success shrink-0" />
        <span className="text-sm text-on-surface truncate flex-1 min-w-0">{doc.name}</span>
        {doc.files.length > 1 && (
          <span className="font-mono text-[11px] text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
            {doc.files.length} files
          </span>
        )}
        {latestUpload && (
          <span className="font-mono text-[11px] text-on-surface-variant hidden sm:inline">
            {new Date(latestUpload).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
          </span>
        )}
        <button
          onClick={() => setViewerOpen(true)}
          className="px-2.5 py-1.5 text-primary text-xs font-semibold hover:bg-surface-container rounded-md transition-colors flex items-center gap-1.5"
        >
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">View</span>
        </button>
        <RowMenu document={doc} actions={actions} onDelete={handleDelete} busy={busy} />
      </div>
      {viewerOpen && <FileViewerModal document={doc} onClose={() => setViewerOpen(false)} onChanged={onChanged} />}
    </>
  )
}

/* ------------------------------------------------------------------ folder */

function FolderSection({
  folder,
  documents,
  actions,
  onChanged,
  isDropTarget,
  onDropDocument,
  onDragOverFolder,
  onDragLeaveFolder,
  onRename,
  onDelete,
}: {
  folder: VisaFolder
  documents: VisaDocument[]
  actions: RowActions
  onChanged: () => void
  isDropTarget: boolean
  onDropDocument: (documentId: string) => void
  onDragOverFolder: () => void
  onDragLeaveFolder: () => void
  onRename: (name: string) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(folder.name)

  const outstanding = documents
    .filter((d) => d.status !== "uploaded")
    .sort((a, b) => urgencyOf(a.deadline).days - urgencyOf(b.deadline).days)
  const onFile = documents.filter((d) => d.status === "uploaded")

  function commitRename() {
    const name = draft.trim()
    setRenaming(false)
    if (name && name !== folder.name) onRename(name)
    else setDraft(folder.name)
  }

  return (
    <section
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(DRAG_TYPE)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
        onDragOverFolder()
      }}
      onDragLeave={onDragLeaveFolder}
      onDrop={(e) => {
        const id = e.dataTransfer.getData(DRAG_TYPE)
        if (!id) return
        e.preventDefault()
        onDropDocument(id)
      }}
      className={`rounded-xl border transition-colors ${
        isDropTarget
          ? "border-primary bg-selected ring-2 ring-primary/30"
          : "border-outline-variant bg-surface-container-low/40"
      }`}
    >
      <header className="flex items-center gap-2.5 px-4 py-3">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? `Collapse ${folder.name}` : `Expand ${folder.name}`}
          className="text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
        </button>
        <FolderOpen className="w-[18px] h-[18px] text-primary shrink-0" />

        {renaming ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename()
              if (e.key === "Escape") {
                setDraft(folder.name)
                setRenaming(false)
              }
            }}
            className="flex-1 min-w-0 font-display text-base font-semibold bg-surface border border-outline-variant rounded-md px-2 py-1 text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        ) : (
          <button
            onClick={() => setRenaming(true)}
            title="Rename folder"
            className="font-display text-base font-semibold text-on-surface truncate text-left hover:text-primary transition-colors"
          >
            {folder.name}
          </button>
        )}

        <span className="font-mono text-[11px] text-on-surface-variant shrink-0">
          {onFile.length}/{documents.length}
        </span>
        <span className="flex-1" />
        <button
          onClick={onDelete}
          title={`Delete ${folder.name}`}
          aria-label={`Delete ${folder.name}`}
          className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container rounded-md transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </header>

      {open && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          {documents.length === 0 ? (
            <p className="text-xs text-on-surface-variant text-center py-4 border border-dashed border-outline-variant rounded-lg">
              Empty — drag a document here, or use its ⋯ menu.
            </p>
          ) : (
            <>
              {outstanding.map((doc) => (
                <OutstandingRow key={doc.id} document={doc} actions={actions} onChanged={onChanged} />
              ))}
              {onFile.map((doc) => (
                <OnFileRow key={doc.id} document={doc} actions={actions} onChanged={onChanged} />
              ))}
            </>
          )}
        </div>
      )}
    </section>
  )
}

/* -------------------------------------------------------------- checklist */

interface DocumentChecklistProps {
  applicationId: string
  documents: VisaDocument[]
  folders: VisaFolder[]
  categories: CategoryOption[]
  onChanged: () => void
}

export function DocumentChecklist({
  applicationId,
  documents,
  folders,
  categories,
  onChanged,
}: DocumentChecklistProps) {
  const [showOnFile, setShowOnFile] = useState(true)
  const [editDoc, setEditDoc] = useState<VisaDocument | null>(null)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [dragging, setDragging] = useState(false)
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  async function handleMove(documentId: string, folderId: string | null) {
    const current = documents.find((d) => d.id === documentId)
    if (!current || current.folderId === folderId) return
    await api.updateDocument(documentId, { folderId })
    onChanged()
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim()
    if (!name) {
      setCreatingFolder(false)
      return
    }
    setNewFolderName("")
    setCreatingFolder(false)
    await api.createFolder(applicationId, name)
    onChanged()
  }

  async function handleRenameFolder(id: string, name: string) {
    await api.renameFolder(id, name)
    onChanged()
  }

  async function handleDeleteFolder(id: string) {
    await api.deleteFolder(id)
    onChanged()
  }

  const actions: RowActions = {
    folders,
    onEdit: setEditDoc,
    onMove: handleMove,
    onDragStart: () => setDragging(true),
    onDragEnd: () => {
      setDragging(false)
      setDropTarget(null)
    },
  }

  if (documents.length === 0 && folders.length === 0) {
    return (
      <>
        <div className="border border-dashed border-outline rounded-xl px-6 py-12 text-center bg-surface-container-low">
          <p className="text-sm text-on-surface-variant">
            Your checklist is empty. Add the first document you need to collect.
          </p>
        </div>
        {editDoc && (
          <DocumentModal
            applicationId={applicationId}
            categories={categories}
            folders={folders}
            document={editDoc}
            onClose={() => setEditDoc(null)}
            onSaved={onChanged}
          />
        )}
      </>
    )
  }

  const rootDocuments = documents.filter((d) => !d.folderId)
  const outstanding = rootDocuments.filter((d) => d.status !== "uploaded")
  const onFile = rootDocuments.filter((d) => d.status === "uploaded")

  // Group what's left by category, most urgent first inside each group.
  const groups = categories
    .map((category) => ({
      ...category,
      items: outstanding
        .filter((d) => categoryKeyOf(d.category, categories) === category.key)
        .sort((a, b) => urgencyOf(a.deadline).days - urgencyOf(b.deadline).days),
    }))
    .filter((g) => g.items.length > 0)

  const everythingOnFile = documents.length > 0 && documents.every((d) => d.status === "uploaded")

  return (
    <div className="flex flex-col gap-stack-lg">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {folders.length === 0 && !creatingFolder ? (
          <p className="text-xs text-on-surface-variant">
            Working with a lot of documents? Group them into folders.
          </p>
        ) : (
          <span />
        )}
        {creatingFolder ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onBlur={handleCreateFolder}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder()
                if (e.key === "Escape") {
                  setNewFolderName("")
                  setCreatingFolder(false)
                }
              }}
              placeholder="Folder name"
              className="px-3 py-2 text-sm rounded-lg border border-outline-variant bg-surface-container-low text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        ) : (
          <button
            onClick={() => setCreatingFolder(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-xs font-semibold hover:border-primary hover:text-primary transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            New folder
          </button>
        )}
      </div>

      {/* Folders */}
      {folders.length > 0 && (
        <div className="flex flex-col gap-stack-md">
          {folders.map((folder) => (
            <FolderSection
              key={folder.id}
              folder={folder}
              documents={documents.filter((d) => d.folderId === folder.id)}
              actions={actions}
              onChanged={onChanged}
              isDropTarget={dropTarget === folder.id}
              onDragOverFolder={() => setDropTarget(folder.id)}
              onDragLeaveFolder={() => setDropTarget((t) => (t === folder.id ? null : t))}
              onDropDocument={(documentId) => {
                setDropTarget(null)
                handleMove(documentId, folder.id)
              }}
              onRename={(name) => handleRenameFolder(folder.id, name)}
              onDelete={() => handleDeleteFolder(folder.id)}
            />
          ))}
        </div>
      )}

      {/*
       * Everything outside a folder. When folders exist this doubles as the
       * drop target for pulling a document back out to the top level.
       */}
      <div
        onDragOver={(e) => {
          if (folders.length === 0 || !e.dataTransfer.types.includes(DRAG_TYPE)) return
          e.preventDefault()
          e.dataTransfer.dropEffect = "move"
          setDropTarget("root")
        }}
        onDragLeave={() => setDropTarget((t) => (t === "root" ? null : t))}
        onDrop={(e) => {
          const id = e.dataTransfer.getData(DRAG_TYPE)
          if (!id) return
          e.preventDefault()
          setDropTarget(null)
          handleMove(id, null)
        }}
        className={`flex flex-col gap-stack-lg rounded-xl transition-colors ${
          dropTarget === "root" ? "ring-2 ring-primary/30 bg-selected/40 p-3 -m-3" : ""
        }`}
      >
        {folders.length > 0 && rootDocuments.length === 0 && dragging && (
          <p className="text-xs text-on-surface-variant text-center py-6 border border-dashed border-outline-variant rounded-lg">
            Drop here to take a document out of its folder.
          </p>
        )}

        {groups.map(({ key, label, Icon, items }) => (
          <section key={key} className="flex flex-col gap-stack-sm">
            <header className="flex items-center gap-2.5 px-1">
              <Icon className="w-4 h-4 text-on-surface-variant" />
              <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">
                {label}
              </h3>
              <span className="font-mono text-[11px] text-on-surface-variant">{items.length}</span>
              <span className="flex-1 h-px bg-outline-variant" />
            </header>
            <div className="flex flex-col gap-2">
              {items.map((doc) => (
                <OutstandingRow key={doc.id} document={doc} actions={actions} onChanged={onChanged} />
              ))}
            </div>
          </section>
        ))}

        {everythingOnFile && (
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
              <span className="font-mono text-[11px] text-on-surface-variant">{onFile.length}</span>
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
                  <OnFileRow key={doc.id} document={doc} actions={actions} onChanged={onChanged} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {editDoc && (
        <DocumentModal
          applicationId={applicationId}
          categories={categories}
          folders={folders}
          document={editDoc}
          onClose={() => setEditDoc(null)}
          onSaved={onChanged}
        />
      )}
    </div>
  )
}
