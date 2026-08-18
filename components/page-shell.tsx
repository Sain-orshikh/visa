import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Logo } from "@/components/logo"

interface PageShellProps {
  title: string
  /** Small mono eyebrow above the title. */
  eyebrow?: string
  description?: string
  children: React.ReactNode
}

/**
 * Frame for the standalone pages (Settings, Support). The dashboard's sidebar
 * is coupled to its own selection state, so these pages take a lighter header
 * with a way back rather than dragging that state along.
 */
export function PageShell({ title, eyebrow, description, children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-outline-variant">
        <div className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="h-16 flex items-center justify-between gap-4">
            <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
              <Logo size={32} priority />
              <span className="font-display text-base font-extrabold text-primary truncate">
                Visa Tracker
              </span>
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">
        <div className="max-w-2xl">
          {eyebrow && (
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-on-surface-variant mb-2">
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-[34px] leading-[1.15] font-extrabold text-on-background text-balance">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-on-surface-variant mt-2.5 text-pretty">{description}</p>
          )}
        </div>

        <div className="max-w-2xl mt-stack-lg flex flex-col gap-stack-lg">{children}</div>
      </main>
    </div>
  )
}

/** A titled card. Every section on Settings and Support is one of these. */
export function SectionCard({
  title,
  description,
  danger = false,
  children,
}: {
  title: string
  description?: string
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <section
      className={`bg-surface rounded-xl border p-gutter shadow-[0_1px_3px_rgba(16,24,40,0.06)] ${
        danger ? "border-error/40" : "border-outline-variant"
      }`}
    >
      <h2
        className={`font-display text-xl font-bold ${danger ? "text-error" : "text-on-surface"}`}
      >
        {title}
      </h2>
      {description && (
        <p className="text-sm text-on-surface-variant mt-1.5 text-pretty">{description}</p>
      )}
      <div className="mt-stack-md">{children}</div>
    </section>
  )
}
