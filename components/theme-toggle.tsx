"use client"

import { Monitor, Moon, Sun } from "@phosphor-icons/react"
import { useTheme, type Theme } from "@/components/theme-provider"

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
]

/**
 * Compact single button for standalone spots. Flips straight between light
 * and dark — the explicit three-way choice lives in Settings / the sidebar.
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
        <Sun className="w-[18px] h-[18px] shrink-0" />
      ) : (
        <Moon className="w-[18px] h-[18px] shrink-0" />
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

/**
 * The full choice, including "follow the system". `compact` renders the
 * three-way segmented control that fits the sidebar footer's width (icon
 * only); the default renders icon + label for Settings.
 */
export function ThemeSegmentedControl({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={`inline-flex gap-1 p-1 rounded-lg bg-surface-container border border-outline-variant ${
        compact ? "w-full" : ""
      }`}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => setTheme(value)}
            className={`flex items-center justify-center gap-2 rounded-md text-sm transition-colors ${
              compact ? "flex-1 py-1.5" : "px-3.5 py-2"
            } ${
              active
                ? "border border-primary-fixed bg-primary-container text-on-primary-container font-medium"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Icon className="w-4 h-4" />
            {!compact && label}
          </button>
        )
      })}
    </div>
  )
}
