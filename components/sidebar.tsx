"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Briefcase, Euro, Flag, GraduationCap, HelpCircle, LogOut, Plane, Plus, Settings } from "lucide-react"
import { Passport } from "@/components/icons"
import { api, type ApplicationSummary } from "@/lib/api"
import type { PublicUser } from "@/lib/types"

function visaIcon(app: ApplicationSummary) {
  const country = app.destinationCountry.toLowerCase()
  if (app.visaType === "student") return GraduationCap
  if (app.visaType === "work") return Briefcase
  if (["france", "germany", "spain", "italy", "schengen"].some((c) => country.includes(c))) return Euro
  if (country.includes("usa") || country.includes("united states")) return Flag
  return Plane
}

interface SidebarProps {
  user: PublicUser
  applications: ApplicationSummary[]
  activeId: string | null
  onSelect: (id: string) => void
  onClose?: () => void
}

export function Sidebar({ user, applications, activeId, onSelect, onClose }: SidebarProps) {
  const router = useRouter()

  async function handleLogout() {
    await api.logout()
    router.push("/login")
    router.refresh()
  }

  return (
    <nav className="bg-surface border-r border-outline-variant flex flex-col h-full w-64 flex-shrink-0 py-stack-lg">
      {/* Brand */}
      <div className="px-gutter mb-stack-lg flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center flex-shrink-0">
          <Passport className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-lg font-extrabold text-primary leading-tight truncate">
            Visa Tracker
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
            Digital Concierge
          </p>
        </div>
      </div>

      {/* Applications */}
      <div className="flex-1 flex flex-col gap-1 px-3 overflow-y-auto">
        <p className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
          My applications
        </p>

        {applications.length === 0 && (
          <p className="px-3 py-2 text-sm text-on-surface-variant">No applications yet.</p>
        )}

        {applications.map((app) => {
          const Icon = visaIcon(app)
          const active = app.id === activeId
          const remaining = app.totalDocuments - app.uploadedDocuments
          return (
            <button
              key={app.id}
              onClick={() => {
                onSelect(app.id)
                onClose?.()
              }}
              aria-current={active ? "true" : undefined}
              /* The accent is the pill's own left edge, so it can't float mid-panel. */
              className={`flex items-center gap-3 pl-3 pr-3 py-2.5 rounded-lg text-left border-l-[3px] transition-colors ${
                active
                  ? "border-l-primary bg-selected text-primary font-semibold"
                  : "border-l-transparent text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              <span className="text-sm truncate flex-1 min-w-0">{app.name}</span>
              {remaining > 0 && (
                <span
                  title={`${remaining} outstanding`}
                  className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-warning-container text-on-warning-container flex-shrink-0"
                >
                  {remaining}
                </span>
              )}
            </button>
          )
        })}

        <div className="mt-stack-md px-1">
          <Link
            href="/new"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors"
          >
            <Plus className="w-4 h-4" />
            Start new visa
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto px-3 pt-stack-sm border-t border-outline-variant flex flex-col gap-0.5">
        <div className="px-3 py-3">
          <p className="text-sm font-semibold text-on-surface truncate">{user.name}</p>
          <p className="font-mono text-[11px] text-on-surface-variant truncate">{user.email}</p>
        </div>
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors text-left">
          <Settings className="w-[18px] h-[18px]" />
          <span className="text-sm">Settings</span>
        </button>
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors text-left">
          <HelpCircle className="w-[18px] h-[18px]" />
          <span className="text-sm">Support</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors text-left"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span className="text-sm">Sign out</span>
        </button>
      </div>
    </nav>
  )
}
