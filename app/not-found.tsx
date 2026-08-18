import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "@phosphor-icons/react/dist/ssr"
import { Logo } from "@/components/logo"

export const metadata: Metadata = {
  title: "Page not found — Passage",
  description: "That address doesn't lead anywhere. Here's the way back.",
}

/** Places worth offering when someone lands on a URL that doesn't exist. */
const DESTINATIONS = [
  { href: "/dashboard", label: "Dashboard", hint: "Every application and where it stands" },
  { href: "/new", label: "New application", hint: "Start tracking another visa" },
  { href: "/settings", label: "Settings", hint: "Account, storage and appearance" },
  { href: "/support", label: "Support", hint: "Ask us something" },
]

/**
 * Rendered by Next for any unmatched URL. Kept static — no session lookup —
 * so a mistyped address never costs a database round trip.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-outline-variant">
        <div className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={22} />
            <span className="font-display text-[15px] font-medium tracking-tight">Passage</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-margin-mobile md:px-margin-desktop py-16 md:py-24">
        <div className="max-w-[52ch] flex flex-col items-start gap-5">
          <span className="font-mono text-[11px] tracking-widest text-primary uppercase">
            Error 404
          </span>
          <h1 className="font-display text-4xl md:text-[52px] leading-[1.05] font-medium tracking-tight text-balance">
            This page took a wrong turn.
          </h1>
          <p className="text-base leading-relaxed text-on-surface-variant text-pretty">
            The address you opened doesn&apos;t exist — a typo, or a link to something that has
            since moved. Nothing has happened to your applications.
          </p>
          <div className="flex flex-wrap gap-3 pt-1.5">
            <Link
              href="/"
              className="border border-primary text-primary rounded-lg px-5 py-3 text-sm font-medium hover:bg-primary/12 active:bg-primary/20 transition-colors"
            >
              Back to home
            </Link>
            <Link
              href="/dashboard"
              className="border border-outline-variant text-on-surface-variant rounded-lg px-5 py-3 text-sm hover:bg-surface-container transition-colors"
            >
              Go to dashboard
            </Link>
          </div>
        </div>

        <div className="mt-14 md:mt-16 max-w-2xl">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-on-surface-variant mb-3">
            Or pick up where you left off
          </div>
          <ul className="border-t border-outline-variant">
            {DESTINATIONS.map((d) => (
              <li key={d.href} className="border-b border-outline-variant">
                <Link
                  href={d.href}
                  className="group flex items-center gap-4 py-4 hover:bg-surface-container transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-on-surface">{d.label}</div>
                    <div className="text-[13px] text-on-surface-variant truncate">{d.hint}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 ml-auto shrink-0 text-on-surface-variant group-hover:text-primary transition-colors" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>

      <footer className="px-margin-mobile md:px-margin-desktop py-8 border-t border-outline-variant max-w-[1200px] w-full mx-auto">
        <span className="font-mono text-xs text-on-surface-variant">
          know exactly where it stands
        </span>
      </footer>
    </div>
  )
}
