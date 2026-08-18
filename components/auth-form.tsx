"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { api } from "@/lib/api"

interface AuthFormProps {
  mode: "login" | "register"
}

const FIELD =
  "w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface text-sm placeholder:text-outline focus:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-0 outline-none transition-all"

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-margin-mobile py-stack-lg">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-stack-lg gap-3">
          <Logo size={40} />
          <h1 className="font-display text-2xl font-medium tracking-tight text-on-background">
            Passage
          </h1>
          <p className="font-mono text-[11px] text-on-surface-variant">
            know exactly where it stands
          </p>
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl p-gutter">
          <h2 className="font-display text-xl font-medium text-on-surface mb-1 tracking-tight">
            {isRegister ? "Create your account" : "Welcome back"}
          </h2>
          <p className="text-sm text-on-surface-variant mb-stack-lg text-pretty">
            {isRegister
              ? "Start tracking your visa documents in one calm workspace."
              : "Sign in to continue tracking your applications."}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md">
            {isRegister && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="name"
                  className="font-mono text-[11px] tracking-widest text-on-surface-variant uppercase"
                >
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
                  className={FIELD}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="font-mono text-[11px] tracking-widest text-on-surface-variant uppercase"
              >
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
                className={FIELD}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="font-mono text-[11px] tracking-widest text-on-surface-variant uppercase"
              >
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
                className={FIELD}
              />
            </div>

            {error && (
              <p
                className="text-sm text-on-error-container bg-error-container rounded-lg px-3 py-2"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full py-2.5 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/12 active:bg-primary/20 transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {loading ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-on-surface-variant mt-stack-lg">
          {isRegister ? "Already have an account? " : "New to Passage? "}
          <Link
            href={isRegister ? "/login" : "/register"}
            className="text-primary font-medium hover:underline"
          >
            {isRegister ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </div>
  )
}
