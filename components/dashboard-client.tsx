"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { CalendarBlank, Check, Compass, List, Plus } from "@phosphor-icons/react"
import { Sidebar } from "@/components/sidebar"
import { Logo } from "@/components/logo"
import { ThemeToggleIcon } from "@/components/theme-toggle"
import { WorldMap } from "@/components/world-map"
import { DocumentChecklist } from "@/components/document-checklist"
import { DocumentModal } from "@/components/document-modal"
import { resolveCategories } from "@/lib/categories"
import { fetcher, type ApplicationDetail, type ApplicationSummary } from "@/lib/api"
import type { PublicUser, UserCategory, VisaDocument, VisaFolder } from "@/lib/types"

interface DashboardClientProps {
  user: PublicUser
}

export function DashboardClient({ user }: DashboardClientProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const { data: appsData, mutate: mutateApps } = useSWR<{ applications: ApplicationSummary[] }>(
    "/api/applications",
    fetcher,
  )
  const allApplications = appsData?.applications ?? []
  // Archived applications stay out of the dashboard; Settings manages them.
  const applications = allApplications.filter((a) => !a.archivedAt)

  // Keep an active application selected.
  useEffect(() => {
    if (applications.length === 0) {
      setActiveId(null)
      return
    }
    if (!activeId || !applications.some((a) => a.id === activeId)) {
      setActiveId(applications[0].id)
    }
  }, [applications, activeId])

  const { data: detail, mutate: mutateDetail } = useSWR<{
    application: ApplicationDetail
    documents: VisaDocument[]
    folders: VisaFolder[]
  }>(activeId ? `/api/applications/${activeId}` : null, fetcher)

  const { data: categoriesData } = useSWR<{ categories: UserCategory[] }>("/api/categories", fetcher)
  const categories = resolveCategories(categoriesData?.categories ?? [])

  function refreshAll() {
    mutateDetail()
    mutateApps()
  }

  const application = detail?.application
  const documents = detail?.documents ?? []
  const folders = detail?.folders ?? []
  const progress = application?.progress ?? 0

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar
          user={user}
          applications={applications}
          activeId={activeId}
          onSelect={setActiveId}
        />
      </div>

      {/* Mobile sidebar drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-on-background/40 backdrop-blur-[1px]"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative z-10">
            <Sidebar
              user={user}
              applications={applications}
              activeId={activeId}
              onSelect={setActiveId}
              onClose={() => setMobileNavOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex justify-between items-center px-margin-mobile h-16 bg-surface border-b border-outline-variant shrink-0">
          <span className="flex items-center gap-2.5 min-w-0">
            <Logo size={24} />
            <span className="font-display text-lg font-medium tracking-tight text-on-background truncate">
              Passage
            </span>
          </span>
          <div className="flex items-center -mr-2">
            <ThemeToggleIcon />
            <button
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
              className="text-on-surface-variant p-2 rounded-lg hover:bg-surface-container transition-colors"
            >
              <List className="w-6 h-6" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">
            {!application ? (
              <EmptyOrLoading hasApps={applications.length > 0} />
            ) : (
              <>
                <ApplicationHeader
                  application={application}
                  progress={progress}
                  onAdd={() => setShowAdd(true)}
                />
                <DocumentChecklist
                  applicationId={application.id}
                  documents={documents}
                  folders={folders}
                  categories={categories}
                  onChanged={refreshAll}
                />
              </>
            )}
          </div>
        </div>
      </main>

      {showAdd && activeId && (
        <DocumentModal
          applicationId={activeId}
          categories={categories}
          folders={folders}
          onClose={() => setShowAdd(false)}
          onSaved={refreshAll}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ header */

const VISA_TYPE_LABEL: Record<string, string> = {
  tourist: "Tourist",
  business: "Business",
  student: "Student",
  work: "Work",
}

function ApplicationHeader({
  application,
  progress,
  onAdd,
}: {
  application: ApplicationDetail
  progress: number
  onAdd: () => void
}) {
  const outstanding = application.totalDocuments - application.uploadedDocuments

  return (
    <section className="mb-stack-lg">
      <div className="flex flex-wrap justify-between items-start mb-stack-md gap-4">
        <div className="min-w-0 flex flex-col gap-2.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-display text-3xl leading-[1.1] font-medium tracking-tight text-on-background text-balance">
              {application.name}
            </h2>
            <span className="border border-primary-fixed text-primary rounded-full px-2.5 py-1 font-mono text-[11px] tracking-widest uppercase">
              {VISA_TYPE_LABEL[application.visaType] ?? application.visaType}
            </span>
          </div>
          <p className="font-mono text-xs text-on-surface-variant flex items-center gap-5 flex-wrap">
            {application.applicantName && <span>{application.applicantName.toUpperCase()}</span>}
            <span className="flex items-center gap-1.5">
              <CalendarBlank className="w-3.5 h-3.5" />
              {application.travelDate
                ? `ENTRY ${new Date(application.travelDate + "T00:00:00")
                    .toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
                    .toUpperCase()}`
                : "NO TARGET ENTRY DATE"}
            </span>
          </p>
          {application.notes && (
            <p className="text-sm text-on-surface-variant max-w-xl text-pretty">{application.notes}</p>
          )}
        </div>
        <button
          onClick={onAdd}
          className="hidden md:flex items-center gap-2 px-4 py-2.5 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/12 active:bg-primary/20 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add document
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-5">
        {/* Progress + phase card */}
        <div className="bg-surface-container rounded-xl border border-outline-variant p-5 flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-5xl leading-none font-medium tracking-tight text-on-surface">
                {progress}%
              </span>
              <span className="text-sm text-on-surface-variant">
                {application.uploadedDocuments} of {application.totalDocuments} documents
              </span>
            </div>
          </div>

          <div
            className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Documents prepared"
          >
            <div
              className="bg-primary h-full rounded-full transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <PhaseGrid outstanding={outstanding} total={application.totalDocuments} />

          <p className="text-xs text-on-surface-variant border-t border-outline-variant pt-3.5">
            Adding a document lowers the percentage — that is on purpose. The ratio is what to trust.
          </p>
        </div>

        {/* Route card */}
        <div className="bg-surface-container rounded-xl border border-outline-variant overflow-hidden flex flex-col">
          <div className="flex justify-between px-4 py-3 border-b border-outline-variant font-mono text-[10px] tracking-widest text-on-surface-variant uppercase">
            <span>Your route</span>
            <span className="text-primary">
              {application.destinationCountry?.toUpperCase() ?? "DESTINATION"}
            </span>
          </div>
          <div className="h-47.5 py-2">
            <WorldMap
              land="var(--color-neutral-800)"
              edge="var(--color-outline-variant)"
              accent="var(--primary)"
              markers={`0,0:${(application.destinationCountry ?? "").slice(0, 3).toUpperCase()}`}
            />
          </div>
          <div className="grid grid-cols-2 border-t border-outline-variant mt-auto">
            <div className="px-4 py-3 border-r border-outline-variant">
              <div className="font-mono text-[9.5px] text-on-surface-variant">CONSULATE</div>
              <div className="text-sm font-medium mt-1">
                {application.destinationCountry || "—"}
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="font-mono text-[9.5px] text-on-surface-variant">DAYS TO ENTRY</div>
              <div className="text-sm font-medium mt-1">
                {application.travelDate
                  ? Math.max(
                      0,
                      Math.round(
                        (new Date(application.travelDate + "T00:00:00").getTime() - Date.now()) /
                          86400000,
                      ),
                    )
                  : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile add button */}
      <button
        onClick={onAdd}
        className="md:hidden w-full mt-stack-md flex items-center justify-center gap-2 px-4 py-3 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/12 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add document
      </button>
    </section>
  )
}

/**
 * Phases derived from real state, not from a position on the bar: you are
 * gathering while anything is outstanding, reviewing once everything is in.
 * Submission stays upcoming — the app doesn't submit.
 */
function PhaseGrid({ outstanding, total }: { outstanding: number; total: number }) {
  const complete = total > 0 && outstanding === 0
  const phases = [
    {
      label: "Gathering",
      sub: complete ? "all in" : `${outstanding} document${outstanding === 1 ? "" : "s"} left`,
      state: complete ? "done" : "now",
    },
    { label: "Review", sub: "when nothing is missing", state: complete ? "now" : "next" },
    { label: "Submission", sub: "you apply in person", state: "later" },
  ] as const

  return (
    <div className="grid grid-cols-3 gap-px bg-outline-variant rounded-lg overflow-hidden">
      {phases.map(({ label, sub, state }, i) => (
        <div
          key={label}
          className={state === "now" ? "bg-primary-container p-3" : "bg-surface-container p-3"}
        >
          <div
            className={`font-mono text-[9px] tracking-widest uppercase ${
              state === "now" ? "text-on-primary-container" : "text-on-surface-variant"
            }`}
          >
            PHASE {i + 1} · {state === "done" ? "DONE" : state === "now" ? "NOW" : state === "next" ? "NEXT" : ""}
          </div>
          <div
            className={`text-sm font-medium mt-1.5 flex items-center gap-1.5 ${
              state === "now" ? "text-on-primary-container" : "text-on-surface"
            }`}
          >
            {state === "done" && <Check className="w-3.5 h-3.5" weight="bold" />}
            {label}
          </div>
          <div
            className={`text-[11px] mt-1 ${
              state === "now" ? "text-on-primary-container" : "text-on-surface-variant"
            }`}
          >
            {sub}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------ empty state */

function EmptyOrLoading({ hasApps }: { hasApps: boolean }) {
  if (hasApps) {
    return (
      <div className="flex flex-col gap-4 animate-pulse" aria-busy="true" aria-live="polite">
        <div className="h-8 w-64 rounded-md bg-surface-container" />
        <div className="h-36 rounded-xl bg-surface-container" />
        <div className="h-16 rounded-lg bg-surface-container" />
        <div className="h-16 rounded-lg bg-surface-container" />
        <span className="sr-only">Loading application…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start text-left py-16 px-8 border border-dashed border-outline-variant rounded-xl max-w-2xl mx-auto mt-8">
      <div className="w-9 h-9 flex items-center justify-center mb-stack-md text-primary-fixed">
        <Compass className="w-8 h-8" />
      </div>
      <h2 className="font-display text-2xl font-medium tracking-tight text-on-surface text-balance max-w-[26ch]">
        One application, one checklist, nothing missing on the day.
      </h2>
      <p className="text-sm text-on-surface-variant mt-3 max-w-md text-pretty">
        Tell Passage where you&rsquo;re going and it builds the document list for that consulate.
        Four short steps, about two minutes.
      </p>
      <Link
        href="/new"
        className="mt-stack-lg inline-flex items-center gap-2 px-5 py-3 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/12 active:bg-primary/20 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Start your first visa
      </Link>
    </div>
  )
}
