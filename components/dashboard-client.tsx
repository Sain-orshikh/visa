"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { Plus, Menu, CalendarDays, X } from "lucide-react"
import { Sidebar } from "@/components/sidebar"
import { DocumentChecklist } from "@/components/document-checklist"
import { AddDocumentModal } from "@/components/add-document-modal"
import { fetcher, type ApplicationDetail, type ApplicationSummary } from "@/lib/api"
import type { PublicUser, VisaDocument } from "@/lib/types"

interface DashboardClientProps {
  user: PublicUser
}

const PHASES = ["Gathering", "Review", "Submission"]

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
    <div className="h-screen w-full flex overflow-hidden bg-surface-container-lowest">
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
          <div className="absolute inset-0 bg-on-background/30" onClick={() => setMobileNavOpen(false)} />
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
          <h1 className="text-lg font-bold text-primary">Visa Tracker</h1>
          <button onClick={() => setMobileNavOpen(true)} aria-label="Open menu" className="text-on-surface-variant">
            <Menu className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">
            {!application ? (
              <EmptyOrLoading hasApps={applications.length > 0} />
            ) : (
              <>
                {/* Header + progress */}
                <div className="mb-stack-lg">
                  <div className="flex justify-between items-end mb-6 gap-4">
                    <div className="min-w-0">
                      <h2 className="text-[32px] leading-[40px] font-bold tracking-tight text-on-background mb-2 text-balance">
                        {application.name}
                      </h2>
                      <p className="text-base text-on-surface-variant flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-secondary" />
                        {application.travelDate
                          ? `Target Entry: ${new Date(application.travelDate + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                          : "No target entry date set"}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAdd(true)}
                      className="hidden md:flex items-center gap-2 px-4 py-2 bg-transparent border border-secondary text-secondary rounded-lg text-xs font-semibold hover:bg-surface-container-low transition-colors flex-shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Document
                    </button>
                  </div>

                  {/* Progress card */}
                  <div className="bg-surface rounded-xl p-6 border border-outline-variant shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xl font-semibold text-on-surface">{progress}% Prepared</span>
                      <span className="text-xs font-semibold text-on-surface-variant">
                        {application.uploadedDocuments} of {application.totalDocuments} Documents
                      </span>
                    </div>
                    <div className="w-full bg-surface-container-high rounded-full h-3 mb-2 overflow-hidden">
                      <div
                        className="bg-primary h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-on-surface-variant mt-2">
                      {PHASES.map((p) => (
                        <span key={p}>{p}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mobile add button */}
                <button
                  onClick={() => setShowAdd(true)}
                  className="md:hidden w-full mb-stack-md flex items-center justify-center gap-2 px-4 py-3 border border-secondary text-secondary rounded-lg text-sm font-semibold hover:bg-surface-container-low transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add New Document
                </button>

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

function EmptyOrLoading({ hasApps }: { hasApps: boolean }) {
  if (hasApps) {
    return <p className="text-on-surface-variant">Loading application…</p>
  }
  return (
    <div className="flex flex-col items-center justify-center text-center py-stack-lg gap-stack-md">
      <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center">
        <X className="w-6 h-6 text-on-surface-variant" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-on-surface">No applications yet</h2>
        <p className="text-sm text-on-surface-variant mt-1">Start a new visa to begin tracking your documents.</p>
      </div>
    </div>
  )
}
