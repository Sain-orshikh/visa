"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Euro, Flag, Plane, Plus, Settings, HelpCircle, LogOut, GraduationCap, Briefcase } from "lucide-react"
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
        <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-sm flex-shrink-0">
          <Passport className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-primary leading-tight truncate">Visa Tracker</h1>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            Digital Concierge
          </p>
        </div>
      </div>

      {/* Applications */}
      <div className="flex-1 flex flex-col gap-1 px-3 overflow-y-auto">
        <p className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
          My Applications
        </p>

        {applications.length === 0 && (
          <p className="px-4 py-2 text-sm text-on-surface-variant">No applications yet.</p>
        )}

        {applications.map((app) => {
          const Icon = visaIcon(app)
          const active = app.id === activeId
          return (
            <button
              key={app.id}
              onClick={() => {
                onSelect(app.id)
                onClose?.()
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors active:scale-[0.98] ${
                active
                  ? "text-primary font-bold border-r-4 border-primary bg-primary/5"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm truncate">{app.name}</span>
            </button>
          )
        })}

        <div className="mt-stack-md px-4">
          <Link
            href="/new"
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Start New Visa
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto px-3 pt-stack-sm border-t border-outline-variant/60 flex flex-col gap-1">
        <div className="px-4 py-2">
          <p className="text-sm font-semibold text-on-surface truncate">{user.name}</p>
          <p className="text-xs text-on-surface-variant truncate">{user.email}</p>
        </div>
        <button className="flex items-center gap-3 px-4 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors text-left">
          <Settings className="w-5 h-5" />
          <span className="text-sm">Settings</span>
        </button>
        <button className="flex items-center gap-3 px-4 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors text-left">
          <HelpCircle className="w-5 h-5" />
          <span className="text-sm">Support</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors text-left"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm">Sign out</span>
        </button>
      </div>
    </nav>
  )
}
