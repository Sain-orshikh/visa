"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, TriangleAlert } from "lucide-react"
import { PageShell, SectionCard } from "@/components/page-shell"
import { ThemeSegmentedControl } from "@/components/theme-toggle"
import { api } from "@/lib/api"
import type { PublicUser } from "@/lib/types"

const FIELD =
  "w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface text-sm placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"

const LABEL = "text-sm font-semibold text-on-surface"

const PRIMARY_BUTTON =
  "px-5 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"

/** Inline result line shared by every form on the page. */
function Feedback({ error, success }: { error?: string | null; success?: string | null }) {
  if (error) {
    return (
      <p
        className="text-sm text-on-error-container bg-error-container rounded-lg px-3 py-2 flex items-start gap-2"
        role="alert"
      >
        <TriangleAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
        {error}
      </p>
    )
  }
  if (success) {
    return (
      <p
        className="text-sm text-on-success-container bg-success-container rounded-lg px-3 py-2 flex items-start gap-2"
        role="status"
      >
        <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
        {success}
      </p>
    )
  }
  return null
}

export function SettingsClient({ user }: { user: PublicUser }) {
  return (
    <PageShell
      title="Settings"
      eyebrow="Account"
      description="Manage your profile, how the app looks, and your sign-in details."
    >
      <ProfileSection user={user} />
      <AppearanceSection />
      <SecuritySection />
      <DangerSection />
    </PageShell>
  )
}

/* ---------------------------------------------------------------- profile */

function ProfileSection({ user }: { user: PublicUser }) {
  const router = useRouter()
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const dirty = name.trim() !== user.name || email.trim().toLowerCase() !== user.email

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      await api.updateProfile({ name, email })
      setSuccess("Profile updated.")
      // The dashboard reads the user server-side, so refresh to pick this up.
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard title="Profile" description="The name and email attached to your account.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md">
        <div className="flex flex-col gap-stack-sm">
          <label htmlFor="settings-name" className={LABEL}>
            Full name
          </label>
          <input
            id="settings-name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={FIELD}
          />
        </div>

        <div className="flex flex-col gap-stack-sm">
          <label htmlFor="settings-email" className={LABEL}>
            Email
          </label>
          <input
            id="settings-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={FIELD}
          />
          <p className="text-xs text-on-surface-variant">
            This is the address you sign in with. Changing it takes effect immediately &mdash; there
            is no confirmation email.
          </p>
        </div>

        <Feedback error={error} success={success} />

        <div>
          <button type="submit" disabled={saving || !dirty} className={PRIMARY_BUTTON}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </SectionCard>
  )
}

/* ------------------------------------------------------------- appearance */

function AppearanceSection() {
  return (
    <SectionCard
      title="Appearance"
      description="Pick a light or dark theme, or follow whatever your device is set to."
    >
      <ThemeSegmentedControl />
    </SectionCard>
  )
}

/* --------------------------------------------------------------- security */

function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.")
      return
    }

    setSaving(true)
    try {
      await api.changePassword({ currentPassword, newPassword })
      setSuccess("Password changed.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard title="Password" description="Use at least 8 characters.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md">
        <div className="flex flex-col gap-stack-sm">
          <label htmlFor="current-password" className={LABEL}>
            Current password
          </label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            className={FIELD}
          />
        </div>

        <div className="flex flex-col gap-stack-sm">
          <label htmlFor="new-password" className={LABEL}>
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            className={FIELD}
          />
        </div>

        <div className="flex flex-col gap-stack-sm">
          <label htmlFor="confirm-password" className={LABEL}>
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat the new password"
            className={FIELD}
          />
        </div>

        <Feedback error={error} success={success} />

        <div>
          <button type="submit" disabled={saving} className={PRIMARY_BUTTON}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Updating…" : "Change password"}
          </button>
        </div>
      </form>
    </SectionCard>
  )
}

/* ------------------------------------------------------------ danger zone */

function DangerSection() {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [password, setPassword] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setDeleting(true)
    try {
      await api.deleteAccount({ password })
      router.push("/register")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
      setDeleting(false)
    }
  }

  return (
    <SectionCard
      title="Delete account"
      description="Removes your applications, documents, and uploaded files. This cannot be undone."
      danger
    >
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="px-5 py-2.5 rounded-lg border border-error text-error text-sm font-semibold hover:bg-error hover:text-on-error transition-colors"
        >
          Delete my account
        </button>
      ) : (
        <form onSubmit={handleDelete} className="flex flex-col gap-stack-md">
          <div className="flex flex-col gap-stack-sm">
            <label htmlFor="delete-password" className={LABEL}>
              Enter your password to confirm
            </label>
            <input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={FIELD}
            />
          </div>

          <Feedback error={error} />

          <div className="flex flex-wrap gap-stack-sm">
            <button
              type="submit"
              disabled={deleting}
              className="px-5 py-2.5 rounded-lg bg-error text-on-error text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              {deleting ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false)
                setPassword("")
                setError(null)
              }}
              className="px-5 py-2.5 rounded-lg border border-outline-variant text-on-surface-variant text-sm font-semibold hover:bg-surface-container-low transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </SectionCard>
  )
}
