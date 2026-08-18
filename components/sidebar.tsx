"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Airplane,
  Briefcase,
  CurrencyEur,
  Flag,
  GraduationCap,
  Plus,
  Gear,
  Question,
  SignOut,
} from "@phosphor-icons/react"
import { Logo } from "@/components/logo"
import { ThemeSegmentedControl } from "@/components/theme-toggle"
import { api, type ApplicationSummary } from "@/lib/api"
import type { PublicUser } from "@/lib/types"

function visaIcon(app: ApplicationSummary) {
  const country = app.destinationCountry.toLowerCase()
  if (app.visaType === "student") return GraduationCap
  if (app.visaType === "work") return Briefcase
  if (["france", "germany", "spain", "italy", "schengen"].some((c) => country.includes(c))) return CurrencyEur
  if (country.includes("usa") || country.includes("united states")) return Flag
  return Airplane
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
    <nav className="bg-surface-container-lowest border-r border-outline-variant flex flex-col h-full w-64 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-5">
        <Logo size={24} />
        <span className="font-display text-[17px] font-medium tracking-tight text-on-background">
          Passage
        </span>
      </div>

      {/* Applications */}
      <div className="flex-1 flex flex-col gap-1 px-2.5 overflow-y-auto">
        <p className="px-2.5 pb-2.5 font-mono text-[10px] tracking-widest text-on-surface-variant uppercase">
          Your visas · {applications.length} active
        </p>

        {applications.length === 0 && (
          <p className="px-2.5 py-2 text-sm text-on-surface-variant">
            No active applications. Archived ones live in Settings.
          </p>
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
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left border transition-colors ${
                active
                  ? "bg-primary-container border-primary-fixed"
                  : "border-transparent text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <span
                className={`w-[3px] h-[22px] rounded-sm shrink-0 ${
                  active ? "bg-primary" : "bg-transparent"
                }`}
              />
              <Icon
                className={`w-[17px] h-[17px] shrink-0 ${active ? "text-on-primary-container" : "text-on-surface-variant"}`}
              />
              <span className="min-w-0 flex flex-col gap-0.5 flex-1">
                <span
                  className={`text-[13.5px] truncate ${
                    active ? "text-on-primary-container font-medium" : "text-on-surface-variant"
                  }`}
                >
                  {app.name}
                </span>
                <span
                  className={`font-mono text-[11px] truncate ${
                    active ? "text-on-primary-container" : "text-on-surface-variant"
                  }`}
                >
                  {remaining > 0 ? `${remaining} outstanding` : "all on file"}
                </span>
              </span>
            </button>
          )
        })}

        <div className="mt-3 px-0.5 pb-1">
          <Link
            href="/new"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/12 active:bg-primary/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Start a new visa
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto px-2.5 pt-3 pb-4 border-t border-outline-variant flex flex-col gap-1">
        <div className="px-2.5 py-2">
          <p className="text-sm font-medium text-on-surface truncate">{user.name}</p>
          <p className="font-mono text-[11px] text-on-surface-variant truncate">{user.email}</p>
        </div>
        <Link
          href="/settings"
          onClick={() => onClose?.()}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors text-left"
        >
          <Gear className="w-[17px] h-[17px]" />
          <span className="text-sm">Settings</span>
        </Link>
        <Link
          href="/support"
          onClick={() => onClose?.()}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors text-left"
        >
          <Question className="w-[17px] h-[17px]" />
          <span className="text-sm">Support</span>
        </Link>
        <div className="px-2.5 pt-1.5">
          <ThemeSegmentedControl compact />
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors text-left mt-0.5"
        >
          <SignOut className="w-[17px] h-[17px]" />
          <span className="text-sm">Sign out</span>
        </button>
      </div>
    </nav>
  )
}
