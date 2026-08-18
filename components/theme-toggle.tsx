"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme, type Theme } from "@/components/theme-provider"

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
]

/**
 * Compact single button for the sidebar footer and mobile bar. Flips straight
 * between light and dark — the explicit three-way choice lives in Settings.
 */
export function ThemeToggleButton({ className = "" }: { className?: string }) {
  const { resolved, setTheme } = useTheme()
  const next = resolved === "dark" ? "light" : "dark"

  return (
    <button
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors text-left ${className}`}
    >
      {resolved === "dark" ? (
        <Sun className="w-[18px] h-[18px] flex-shrink-0" />
      ) : (
        <Moon className="w-[18px] h-[18px] flex-shrink-0" />
      )}
      <span className="text-sm">{resolved === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  )
}

/** Icon-only variant for tight spots like the mobile top bar. */
export function ThemeToggleIcon({ className = "" }: { className?: string }) {
  const { resolved, setTheme } = useTheme()
  const next = resolved === "dark" ? "light" : "dark"

  return (
    <button
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      className={`p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors ${className}`}
    >
      {resolved === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  )
}

/** The full choice, including "follow the system". Used on the Settings page. */
export function ThemeSegmentedControl() {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="inline-flex gap-1 p-1 rounded-lg bg-surface-container border border-outline-variant"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-sm transition-colors ${
              active
                ? "bg-surface text-on-surface font-semibold shadow-[0_1px_2px_rgba(16,24,40,0.08)]"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
