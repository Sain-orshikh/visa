"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { CalendarDays, Check, Compass, Menu, Plus } from "lucide-react"
import { Sidebar } from "@/components/sidebar"
import { Logo } from "@/components/logo"
import { ThemeToggleIcon } from "@/components/theme-toggle"
import { DocumentChecklist } from "@/components/document-checklist"
import { AddDocumentModal } from "@/components/add-document-modal"
import { fetcher, type ApplicationDetail, type ApplicationSummary } from "@/lib/api"
import type { PublicUser, VisaDocument } from "@/lib/types"

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
  const applications = appsData?.applications ?? []

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
  }>(activeId ? `/api/applications/${activeId}` : null, fetcher)

  function refreshAll() {
    mutateDetail()
    mutateApps()
  }

  const application = detail?.application
  const documents = detail?.documents ?? []
  const progress = application?.progress ?? 0

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
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
        <header className="md:hidden flex justify-between items-center px-margin-mobile h-16 bg-surface border-b border-outline-variant flex-shrink-0">
          <span className="flex items-center gap-2.5 min-w-0">
            <Logo size={28} priority />
            <span className="font-display text-lg font-extrabold text-primary truncate">
              Visa Tracker
            </span>
          </span>
          <div className="flex items-center -mr-2">
            <ThemeToggleIcon />
            <button
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
              className="text-on-surface-variant p-2 rounded-lg hover:bg-surface-container transition-colors"
            >
              <Menu className="w-6 h-6" />
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
                <DocumentChecklist documents={documents} onChanged={refreshAll} />
              </>
            )}
          </div>
        </div>
      </main>

      {showAdd && activeId && (
        <AddDocumentModal applicationId={activeId} onClose={() => setShowAdd(false)} onAdded={refreshAll} />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ header */

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
      <div className="flex justify-between items-start mb-stack-md gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-on-surface-variant mb-2">
            Application · {application.visaType}
            {application.applicantName ? ` · ${application.applicantName}` : ""}
          </p>
          <h2 className="font-display text-[34px] leading-[1.15] font-extrabold text-on-background text-balance">
            {application.name}
          </h2>
          <p className="font-mono text-xs text-on-surface-variant flex items-center gap-2 mt-2.5">
            <CalendarDays className="w-4 h-4" />
            {application.travelDate
              ? `Target entry ${new Date(application.travelDate + "T00:00:00")
                  .toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
                  .toUpperCase()}`
              : "No target entry date set"}
          </p>
          {application.notes && (
            <p className="text-sm text-on-surface-variant mt-2 max-w-xl text-pretty">{application.notes}</p>
          )}
        </div>
        <button
          onClick={onAdd}
          className="hidden md:flex items-center gap-2 px-4 py-2.5 border border-primary text-primary rounded-lg text-xs font-semibold hover:bg-primary hover:text-on-primary transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add document
        </button>
      </div>

      {/* Progress card, closed by the machine-readable zone. */}
      <div className="bg-surface rounded-xl border border-outline-variant shadow-[0_1px_3px_rgba(16,24,40,0.06)] overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-baseline mb-3 gap-4">
            <span className="font-display text-2xl font-bold text-on-surface">{progress}% prepared</span>
            <span className="font-mono text-xs text-on-surface-variant">
              {application.uploadedDocuments} of {application.totalDocuments} documents
            </span>
          </div>

          <div
            className="w-full bg-surface-container-high rounded-full h-2.5 overflow-hidden"
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

          <PhaseStepper outstanding={outstanding} total={application.totalDocuments} />
        </div>

        <MrzBand application={application} progress={progress} />
      </div>

      {/* Mobile add button */}
      <button
        onClick={onAdd}
        className="md:hidden w-full mt-stack-md flex items-center justify-center gap-2 px-4 py-3 border border-primary text-primary rounded-lg text-sm font-semibold hover:bg-primary hover:text-on-primary transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add document
      </button>
    </section>
  )
}

/**
 * Phases derived from real state, not from a position on the bar:
 * you are gathering while anything is outstanding, reviewing once
 * everything is in. Submission stays upcoming — the app doesn't submit.
 */
function PhaseStepper({ outstanding, total }: { outstanding: number; total: number }) {
  const complete = total > 0 && outstanding === 0
  const phases = [
    { label: "Gathering", done: complete, active: !complete },
    { label: "Review", done: false, active: complete },
    { label: "Submission", done: false, active: false },
  ]

  return (
    <ol className="flex items-center gap-2 mt-5">
      {phases.map(({ label, done, active }, i) => (
        <li key={label} className="flex items-center gap-2 min-w-0">
          {i > 0 && <span className="w-4 sm:w-8 h-px bg-outline-variant flex-shrink-0" />}
          <span
            aria-hidden="true"
            className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
              done
                ? "bg-success text-on-primary"
                : active
                  ? "bg-primary ring-4 ring-primary/15"
                  : "border-2 border-outline-variant"
            }`}
          >
            {done && <Check className="w-2.5 h-2.5" strokeWidth={3.5} />}
          </span>
          <span
            className={`font-mono text-[11px] uppercase tracking-[0.12em] truncate ${
              done || active ? "text-on-surface font-medium" : "text-on-surface-variant"
            }`}
          >
            {label}
          </span>
        </li>
      ))}
    </ol>
  )
}

/* -------------------------------------------------------------- signature */

function mrzPad(value: string, length: number): string {
  return (value + "<".repeat(length)).slice(0, length)
}

function mrzText(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "<")
    .replace(/^<+|<+$/g, "")
}

const VISA_CODE: Record<string, string> = { tourist: "T", work: "B", student: "S" }

/**
 * The signature element: a machine-readable zone, the way a passport data
 * page ends. Every character is real application data, chevron-padded to the
 * ICAO line length — decorative in feel, honest in content.
 */
function MrzBand({ application, progress }: { application: ApplicationDetail; progress: number }) {
  const country = mrzPad(mrzText(application.destinationCountry).replace(/</g, ""), 3)
  const holder = mrzText(application.applicantName || application.name)
  const travel = application.travelDate
    ? application.travelDate.replace(/-/g, "").slice(2)
    : "<<<<<<"

  const line1 = mrzPad(`V<${country}<${holder}`, 44)
  const line2 = mrzPad(
    `${VISA_CODE[application.visaType] ?? "T"}${travel}<${application.uploadedDocuments}OF${application.totalDocuments}<${progress}PCT`,
    44,
  )

  return (
    <div
      className="mrz bg-stamp-container text-on-stamp-container border-t border-outline-variant px-6 py-3 select-none"
      aria-hidden="true"
    >
      <div>{line1}</div>
      <div>{line2}</div>
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
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="w-14 h-14 rounded-full bg-stamp-container text-stamp flex items-center justify-center mb-stack-md">
        <Compass className="w-7 h-7" />
      </div>
      <h2 className="font-display text-2xl font-bold text-on-surface text-balance">
        Start your first application
      </h2>
      <p className="text-sm text-on-surface-variant mt-2 max-w-sm text-pretty">
        Pick a destination and we'll build the document checklist for you. Add deadlines as you go and
        upload each item once you have it.
      </p>
      <Link
        href="/new"
        className="mt-stack-lg inline-flex items-center gap-2 px-5 py-3 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors"
      >
        <Plus className="w-4 h-4" />
        Start new visa
      </Link>
    </div>
  )
}
