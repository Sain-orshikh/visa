"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

export type Theme = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

/** Shared with the pre-paint script in app/layout.tsx — keep the two in step. */
export const THEME_STORAGE_KEY = "vt-theme"

interface ThemeContextValue {
  /** What the user chose, including "system". */
  theme: Theme
  /** What that actually resolves to right now. */
  resolved: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system"
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system"
}

/**
 * The token sets in globals.css key off an explicit class on <html>, so the
 * resolved theme is always stamped as either `.light` or `.dark` — never
 * neither, and never both. That keeps `@custom-variant dark` and the
 * `:root:not(.light)` media guard agreeing with each other.
 */
function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement
  root.classList.toggle("dark", resolved === "dark")
  root.classList.toggle("light", resolved === "light")
  root.style.colorScheme = resolved
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Server-render the neutral default; the pre-paint script has already put
  // the real theme on <html>, so there is nothing to flash.
  const [theme, setThemeState] = useState<Theme>("system")
  const [resolved, setResolved] = useState<ResolvedTheme>("light")

  // Adopt the stored preference once we're on the client.
  useEffect(() => {
    const stored = readStoredTheme()
    setThemeState(stored)
    setResolved(stored === "system" ? systemTheme() : stored)
  }, [])

  // Follow the OS while the choice is "system".
  useEffect(() => {
    if (theme !== "system") return
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => setResolved(media.matches ? "dark" : "light")
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [theme])

  useEffect(() => {
    applyTheme(resolved)
  }, [resolved])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    setResolved(next === "system" ? systemTheme() : next)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Private mode or blocked storage — the theme still applies for this session.
    }
  }, [])

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used inside a ThemeProvider")
  return context
}
