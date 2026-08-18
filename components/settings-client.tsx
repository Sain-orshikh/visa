"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import {
  Archive,
  ArchiveRestore,
  Check,
  Cloud,
  HardDrive,
  Loader2,
  Lock,
  Plus,
  Server,
  Tag,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react"
import { PageShell, SectionCard } from "@/components/page-shell"
import { ThemeSegmentedControl } from "@/components/theme-toggle"
import { api, fetcher, type ApplicationSummary } from "@/lib/api"
import { BUILT_IN_CATEGORIES } from "@/lib/categories"
import type { PublicUser, StorageProvider, StorageSettings, UserCategory } from "@/lib/types"

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
      <StorageSection />
      <CategoriesSection />
      <ApplicationsSection />
      <AppearanceSection />
      <SecuritySection />
      <DangerSection />
    </PageShell>
  )
}

/* ------------------------------------------------------------- categories */

function CategoriesSection() {
  const { data, mutate } = useSWR<{ categories: UserCategory[] }>("/api/categories", fetcher)
  const categories = data?.categories ?? []

  const [label, setLabel] = useState("")
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) return
    setError(null)
    setSaving(true)
    try {
      const result = await api.createCategory(label)
      mutate({ categories: result.categories }, { revalidate: false })
      setLabel("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the category.")
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(id: string) {
    setError(null)
    setRemovingId(id)
    try {
      const result = await api.deleteCategory(id)
      mutate({ categories: result.categories }, { revalidate: false })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the category.")
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <SectionCard
      title="Document categories"
      description="Categories group documents in your checklist. Add your own alongside the built-in ones."
    >
      <div className="flex flex-col gap-stack-md">
        <div className="flex flex-wrap gap-2">
          {BUILT_IN_CATEGORIES.map(({ key, label: builtInLabel, Icon }) => (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant text-xs font-medium"
            >
              <Icon className="w-3.5 h-3.5" />
              {builtInLabel}
              <span className="font-mono text-[10px] uppercase tracking-wider opacity-60">built-in</span>
            </span>
          ))}
          {categories.map((category) => (
            <span
              key={category.id}
              className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-lg bg-selected text-primary text-xs font-medium border border-primary/30"
            >
              <Tag className="w-3.5 h-3.5" />
              {category.label}
              <button
                onClick={() => handleRemove(category.id)}
                disabled={removingId === category.id}
                aria-label={`Remove ${category.label}`}
                className="p-0.5 rounded hover:bg-primary/15 transition-colors disabled:opacity-50"
              >
                {removingId === category.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
              </button>
            </span>
          ))}
        </div>

        <form onSubmit={handleAdd} className="flex gap-stack-sm">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={32}
            placeholder="e.g. Medical, Sponsorship, Legal"
            className={FIELD}
          />
          <button type="submit" disabled={saving || !label.trim()} className={`${PRIMARY_BUTTON} shrink-0`}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </form>

        <p className="text-xs text-on-surface-variant">
          Removing a category doesn&apos;t delete any documents &mdash; they move back to
          &ldquo;Other&rdquo;.
        </p>

        <Feedback error={error} />
      </div>
    </SectionCard>
  )
}

/* ---------------------------------------------------------------- storage */

const PROVIDER_COPY: Record<StorageProvider, { label: string; blurb: string; Icon: typeof Cloud }> = {
  app: {
    label: "Visa Tracker storage",
    blurb: "Files are uploaded to this app's own storage. Nothing to set up.",
    Icon: Server,
  },
  cloudinary: {
    label: "Your own Cloudinary",
    blurb: "Uploads go straight to your Cloudinary account. We only keep the link.",
    Icon: Cloud,
  },
  "google-drive": {
    label: "Your own Google Drive",
    blurb: "Files land in a Visa Tracker folder in your Drive, private to your account.",
    Icon: HardDrive,
  },
}

const PROVIDER_ORDER: StorageProvider[] = ["app", "cloudinary", "google-drive"]

/**
 * Storage is the one setting with a privacy consequence, so the choice is laid
 * out in full rather than hidden behind a dropdown. Whichever provider is
 * selected is where new uploads go; files already uploaded stay put.
 */
function StorageSection() {
  const { data, mutate, isLoading } = useSWR<{ storage: StorageSettings }>("/api/storage", fetcher)
  const storage = data?.storage

  const [pending, setPending] = useState<StorageProvider | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [cloudName, setCloudName] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [apiSecret, setApiSecret] = useState("")

  // The Google flow comes back through a redirect, so its result arrives as a
  // query string rather than a fetch response.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connected = params.get("storage_connected")
    const failed = params.get("storage_error")
    if (!connected && !failed) return
    if (connected) setSuccess("Google Drive connected. New uploads go to your Drive.")
    if (failed) setError(failed)
    params.delete("storage_connected")
    params.delete("storage_error")
    const query = params.toString()
    window.history.replaceState({}, "", window.location.pathname + (query ? "?" + query : ""))
  }, [])

  const selected = pending ?? storage?.provider ?? "app"
  const dirty = pending !== null && pending !== storage?.provider
  const hasCloudinaryInput = Boolean(cloudName || apiKey || apiSecret)

  function reset() {
    setError(null)
    setSuccess(null)
  }

  async function handleSave() {
    reset()
    setBusy(true)
    try {
      const input: Parameters<typeof api.updateStorage>[0] = { provider: selected }
      if (selected === "cloudinary" && hasCloudinaryInput) {
        input.cloudinary = {
          cloudName: cloudName.trim(),
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim(),
        }
      }
      const result = await api.updateStorage(input)
      mutate({ storage: result.storage }, { revalidate: false })
      setPending(null)
      setCloudName("")
      setApiKey("")
      setApiSecret("")
      setSuccess(`New uploads now go to ${PROVIDER_COPY[result.storage.provider].label}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update storage.")
    } finally {
      setBusy(false)
    }
  }

  async function handleConnectGoogle() {
    reset()
    setBusy(true)
    try {
      const { authUrl } = await api.startGoogleDriveConnect()
      window.location.href = authUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the Google connection.")
      setBusy(false)
    }
  }

  async function handleDisconnect(target: "cloudinary" | "google-drive") {
    reset()
    setBusy(true)
    try {
      const result = await api.disconnectStorage(target)
      mutate({ storage: result.storage }, { revalidate: false })
      setPending(null)
      setSuccess(`Disconnected. New uploads go to ${PROVIDER_COPY[result.storage.provider].label}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect.")
    } finally {
      setBusy(false)
    }
  }

  function available(provider: StorageProvider) {
    if (!storage) return false
    if (provider === "app") return storage.appStorageAvailable
    if (provider === "google-drive") return storage.googleDriveAvailable
    return true
  }

  return (
    <SectionCard
      title="File storage"
      description="Choose where your uploaded documents are kept. Point this at your own cloud and your files never sit on our storage at all."
    >
      {isLoading || !storage ? (
        <p className="text-sm text-on-surface-variant flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading&hellip;
        </p>
      ) : (
        <div className="flex flex-col gap-stack-md">
          <div className="flex flex-col gap-2">
            {PROVIDER_ORDER.map((provider) => {
              const { label, blurb, Icon } = PROVIDER_COPY[provider]
              const active = selected === provider
              const current = storage.provider === provider
              const enabled = available(provider)

              return (
                <label
                  key={provider}
                  className={`flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
                    active
                      ? "border-primary bg-selected"
                      : "border-outline-variant bg-surface-container-low hover:border-primary/50"
                  } ${enabled ? "cursor-pointer" : "opacity-60 cursor-not-allowed"}`}
                >
                  <input
                    type="radio"
                    name="storage-provider"
                    value={provider}
                    checked={active}
                    disabled={!enabled || busy}
                    onChange={() => {
                      reset()
                      setPending(provider)
                    }}
                    className="mt-1 accent-primary"
                  />
                  <Icon
                    className={`w-4 h-4 mt-0.5 shrink-0 ${active ? "text-primary" : "text-on-surface-variant"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-on-surface">{label}</span>
                      {current && (
                        <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
                          in use
                        </span>
                      )}
                      {!enabled && (
                        <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                          unavailable
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-on-surface-variant mt-0.5">{blurb}</span>

                    {provider === "cloudinary" && storage.cloudinary && (
                      <span className="block font-mono text-[11px] text-on-surface-variant mt-1">
                        {storage.cloudinary.cloudName} &middot; key {storage.cloudinary.apiKey}
                      </span>
                    )}
                    {provider === "google-drive" && storage.googleDrive && (
                      <span className="block font-mono text-[11px] text-on-surface-variant mt-1">
                        {storage.googleDrive.accountEmail ?? "connected"}
                      </span>
                    )}
                  </span>
                </label>
              )
            })}
          </div>

          {selected === "cloudinary" && (
            <div className="flex flex-col gap-stack-sm rounded-lg border border-outline-variant p-4">
              <p className="text-sm font-semibold text-on-surface">Cloudinary credentials</p>
              <p className="text-xs text-on-surface-variant">
                Take these from your Cloudinary dashboard. The API secret is encrypted before it is
                stored, and is never sent back to the browser.
              </p>
              <input
                type="text"
                value={cloudName}
                onChange={(e) => setCloudName(e.target.value)}
                placeholder={storage.cloudinary ? `Cloud name (${storage.cloudinary.cloudName})` : "Cloud name"}
                autoComplete="off"
                className={FIELD}
              />
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={storage.cloudinary ? `API key (${storage.cloudinary.apiKey})` : "API key"}
                autoComplete="off"
                className={FIELD}
              />
              <input
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder={storage.cloudinary ? "API secret (saved — leave blank to keep)" : "API secret"}
                autoComplete="new-password"
                className={FIELD}
              />
              {storage.cloudinary && (
                <div>
                  <button
                    type="button"
                    onClick={() => handleDisconnect("cloudinary")}
                    disabled={busy}
                    className="text-xs font-semibold text-error hover:underline disabled:opacity-60"
                  >
                    Forget these credentials
                  </button>
                </div>
              )}
            </div>
          )}

          {selected === "google-drive" && storage.googleDriveAvailable && (
            <div className="flex flex-col gap-stack-sm rounded-lg border border-outline-variant p-4">
              <p className="text-sm font-semibold text-on-surface">Google account</p>
              <p className="text-xs text-on-surface-variant">
                We ask only for permission to manage files this app creates &mdash; the rest of your
                Drive stays out of reach.
              </p>
              {storage.googleDrive ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-on-surface">
                    Connected as {storage.googleDrive.accountEmail ?? "your Google account"}
                  </span>
                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    disabled={busy}
                    className="text-xs font-semibold text-primary hover:underline disabled:opacity-60"
                  >
                    Reconnect
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDisconnect("google-drive")}
                    disabled={busy}
                    className="text-xs font-semibold text-error hover:underline disabled:opacity-60"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div>
                  <button type="button" onClick={handleConnectGoogle} disabled={busy} className={PRIMARY_BUTTON}>
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                    Connect Google Drive
                  </button>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-on-surface-variant flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Switching only affects new uploads. Files you have already uploaded stay where they are,
            and remain viewable for as long as that provider stays connected.
          </p>

          <Feedback error={error} success={success} />

          <div>
            <button
              type="button"
              onClick={handleSave}
              disabled={busy || (!dirty && !hasCloudinaryInput)}
              className={PRIMARY_BUTTON}
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {busy ? "Saving…" : "Save storage settings"}
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  )
}

/* ----------------------------------------------------------- applications */

function ApplicationsSection() {
  const { data, mutate } = useSWR<{ applications: ApplicationSummary[] }>("/api/applications", fetcher)
  const applications = data?.applications ?? []

  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const active = applications.filter((a) => !a.archivedAt)
  const archived = applications.filter((a) => a.archivedAt)

  async function handleArchive(id: string, archive: boolean) {
    setError(null)
    setBusyId(id)
    try {
      await api.setApplicationArchived(id, archive)
      await mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the application.")
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(id: string) {
    setError(null)
    setBusyId(id)
    try {
      await api.deleteApplication(id)
      setConfirmingId(null)
      await mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the application.")
    } finally {
      setBusyId(null)
    }
  }

  function row(app: ApplicationSummary, isArchived: boolean) {
    const busy = busyId === app.id
    const confirming = confirmingId === app.id

    return (
      <div
        key={app.id}
        className="flex flex-wrap items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-on-surface truncate">{app.name}</p>
          <p className="font-mono text-[11px] text-on-surface-variant">
            {app.uploadedDocuments}/{app.totalDocuments} documents
            {isArchived && app.archivedAt
              ? ` · archived ${new Date(app.archivedAt).toLocaleDateString(undefined, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}`
              : ""}
          </p>
        </div>

        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-error font-medium">Delete permanently?</span>
            <button
              onClick={() => handleDelete(app.id)}
              disabled={busy}
              className="px-3 py-1.5 rounded-md bg-error text-on-error text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 inline-flex items-center gap-1.5"
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Yes, delete
            </button>
            <button
              onClick={() => setConfirmingId(null)}
              className="px-3 py-1.5 rounded-md border border-outline-variant text-on-surface-variant text-xs font-semibold hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleArchive(app.id, !isArchived)}
              disabled={busy}
              className="px-3 py-1.5 rounded-md border border-outline-variant text-on-surface-variant text-xs font-semibold hover:border-primary hover:text-primary transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {busy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isArchived ? (
                <ArchiveRestore className="w-3.5 h-3.5" />
              ) : (
                <Archive className="w-3.5 h-3.5" />
              )}
              {isArchived ? "Restore" : "Archive"}
            </button>
            <button
              onClick={() => setConfirmingId(app.id)}
              disabled={busy}
              aria-label={`Delete ${app.name}`}
              className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container rounded-md transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <SectionCard
      title="Your visas"
      description="Archive an application to clear it off the dashboard without losing anything, or delete it for good."
    >
      <div className="flex flex-col gap-stack-md">
        {applications.length === 0 && (
          <p className="text-sm text-on-surface-variant">You don&apos;t have any applications yet.</p>
        )}

        {active.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
              Active
            </p>
            {active.map((app) => row(app, false))}
          </div>
        )}

        {archived.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
              Archived
            </p>
            {archived.map((app) => row(app, true))}
          </div>
        )}

        <Feedback error={error} />
      </div>
    </SectionCard>
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
              className="px-5 py-2.5 rounded-lg border border-outline-variant text-on-surface-variant text-sm font-semibold hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </SectionCard>
  )
}
