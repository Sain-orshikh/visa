"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Passport } from "@/components/icons"
import { api } from "@/lib/api"

interface AuthFormProps {
  mode: "login" | "register"
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isRegister = mode === "register"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (isRegister) {
        await api.register({ name, email, password })
      } else {
        await api.login({ email, password })
      }
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-container-low px-margin-mobile py-stack-lg">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-stack-lg">
          <div className="w-14 h-14 rounded-xl bg-primary text-on-primary flex items-center justify-center mb-stack-md shadow-sm">
            <Passport className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Visa Tracker</h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mt-1">
            Digital Concierge
          </p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter shadow-sm">
          <h2 className="text-xl font-semibold text-on-surface mb-1">
            {isRegister ? "Create your account" : "Welcome back"}
          </h2>
          <p className="text-sm text-on-surface-variant mb-stack-lg">
            {isRegister
              ? "Start tracking your visa documents in one calm workspace."
              : "Sign in to continue tracking your applications."}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md">
            {isRegister && (
              <div className="flex flex-col gap-stack-sm">
                <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wide text-on-surface">
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Traveler"
                  className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface text-on-surface text-sm placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
            )}

            <div className="flex flex-col gap-stack-sm">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-on-surface">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface text-on-surface text-sm placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-stack-sm">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-on-surface">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegister ? "At least 8 characters" : "••••••••"}
                className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface text-on-surface text-sm placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>

            {error && (
              <p className="text-sm text-on-error-container bg-error-container rounded-lg px-3 py-2" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-stack-sm w-full py-3 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-on-surface-variant mt-stack-lg">
          {isRegister ? "Already have an account? " : "New to Visa Tracker? "}
          <Link
            href={isRegister ? "/login" : "/register"}
            className="text-primary font-semibold hover:underline"
          >
            {isRegister ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </div>
  )
}
