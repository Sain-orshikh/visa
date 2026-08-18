"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Calendar as CalendarToday,
  Check,
  GraduationCap,
  Luggage,
  Plus,
  Search,
  X,
} from "lucide-react"
import { api } from "@/lib/api"
import type { VisaType } from "@/lib/types"
import { COUNTRIES } from "@/lib/countries"

const STEPS = ["Destination", "Details", "Documents", "Review"]

const VISA_OPTIONS: { value: VisaType; label: string; description: string; Icon: typeof Luggage }[] = [
  { value: "tourist", label: "Tourist", description: "Leisure and short visits", Icon: Luggage },
  { value: "work", label: "Business", description: "Meetings and work", Icon: Briefcase },
  { value: "student", label: "Student", description: "Study programs", Icon: GraduationCap },
]

/** Categories travel with the starter docs so the checklist can group them. */
const STARTER_DOCS: { name: string; category: string }[] = [
  { name: "Passport Copy", category: "identity" },
  { name: "Bank Statements", category: "financial" },
  { name: "Flight Itinerary", category: "travel" },
  { name: "Travel Insurance", category: "identity" },
  { name: "Proof of Accommodation", category: "travel" },
  { name: "Employment Letter", category: "financial" },
]

interface CustomDoc {
  id: string
  name: string
  note: string
}

export function NewVisaWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [destination, setDestination] = useState("")
  const [countryQuery, setCountryQuery] = useState("")
  const [countryOpen, setCountryOpen] = useState(false)
  const [visaType, setVisaType] = useState<VisaType>("tourist")
  const [travelDate, setTravelDate] = useState("")
  const [applicantName, setApplicantName] = useState("")
  const [notes, setNotes] = useState("")
  const [selectedDocs, setSelectedDocs] = useState<string[]>([
    "Passport Copy",
    "Bank Statements",
    "Flight Itinerary",
    "Travel Insurance",
  ])
  const [docNotes, setDocNotes] = useState<Record<string, string>>({})
  const [customDocs, setCustomDocs] = useState<CustomDoc[]>([])
  const [customDocName, setCustomDocName] = useState("")

  const countryContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (countryContainerRef.current && !countryContainerRef.current.contains(e.target as Node)) {
        setCountryOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  const filteredCountries = COUNTRIES.filter((c) => c.toLowerCase().includes(countryQuery.trim().toLowerCase())).slice(
    0,
    8,
  )

  function selectCountry(country: string) {
    setDestination(country)
    setCountryQuery(country)
    setCountryOpen(false)
  }

  const visaLabel = VISA_OPTIONS.find((v) => v.value === visaType)?.label ?? ""

  function toggleDoc(name: string) {
    setSelectedDocs((prev) => (prev.includes(name) ? prev.filter((d) => d !== name) : [...prev, name]))
  }

  function addCustomDoc() {
    const name = customDocName.trim()
    if (!name) return
    setCustomDocs((prev) => [...prev, { id: crypto.randomUUID(), name, note: "" }])
    setCustomDocName("")
  }

  function removeCustomDoc(id: string) {
    setCustomDocs((prev) => prev.filter((d) => d.id !== id))
  }

  function updateCustomDocNote(id: string, note: string) {
    setCustomDocs((prev) => prev.map((d) => (d.id === id ? { ...d, note } : d)))
  }

  function canProceed(): boolean {
    if (step === 0) return destination.trim().length > 0
    return true
  }

  const totalDocs = selectedDocs.length + customDocs.length

  async function handleFinish() {
    setSaving(true)
    setError(null)
    try {
      const { application } = await api.createApplication({
        destinationCountry: destination.trim(),
        visaType,
        travelDate: travelDate || null,
        applicantName: applicantName.trim() || null,
        notes: notes.trim() || null,
      })
      // Seed the chosen starter documents, carrying their category and any note through.
      for (const name of selectedDocs) {
        const starter = STARTER_DOCS.find((d) => d.name === name)
        await api.createDocument(application.id, {
          name,
          category: starter?.category ?? null,
          description: docNotes[name]?.trim() || undefined,
        })
      }
      // Seed any custom documents the applicant added.
      for (const doc of customDocs) {
        await api.createDocument(application.id, {
          name: doc.name,
          description: doc.note.trim() || undefined,
        })
      }
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create application.")
      setSaving(false)
    }
  }

  /*
   * Rail geometry. Each step is flex-1, so its marker centres at
   * ((i + 0.5) / n) of the row. The rail therefore spans from the first
   * centre to the last, and the fill lands exactly on the current marker.
   */
  const n = STEPS.length
  const railLeft = 50 / n
  const railWidth = ((n - 1) / n) * 100
  const fillWidth = railWidth * (step / (n - 1))

  return (
    <main className="flex flex-col h-screen overflow-y-auto bg-background">
      {/* Top bar */}
      <header className="bg-surface border-b border-outline-variant flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 shrink-0">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-xs font-semibold hidden sm:inline">Cancel application</span>
        </button>
        <span className="font-display text-lg font-extrabold text-primary">Visa Tracker</span>
        <div className="w-24" />
      </header>

      {/* Progress rail */}
      <div className="bg-surface px-margin-mobile md:px-margin-desktop py-stack-md border-b border-outline-variant shrink-0">
        <div className="max-w-3xl mx-auto w-full">
          <div className="relative">
            <span
              aria-hidden="true"
              className="absolute top-4 h-0.5 -translate-y-1/2 bg-surface-container-high rounded-full"
              style={{ left: `${railLeft}%`, width: `${railWidth}%` }}
            />
            <span
              aria-hidden="true"
              className="absolute top-4 h-0.5 -translate-y-1/2 bg-primary rounded-full transition-[width] duration-500 ease-out"
              style={{ left: `${railLeft}%`, width: `${fillWidth}%` }}
            />
            <ol className="relative flex items-start">
              {STEPS.map((label, i) => {
                const done = i < step
                const active = i === step
                return (
                  <li key={label} className="flex-1 flex flex-col items-center gap-2">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
                        active
                          ? "bg-primary text-on-primary border-primary"
                          : done
                            ? "bg-primary text-on-primary border-primary"
                            : "bg-surface text-on-surface-variant border-outline-variant"
                      }`}
                    >
                      {done ? <Check className="w-4 h-4" strokeWidth={3} /> : i + 1}
                    </span>
                    <span
                      className={`font-mono text-[10px] uppercase tracking-[0.12em] text-center ${
                        active || done ? "text-primary font-medium" : "text-on-surface-variant"
                      }`}
                    >
                      {label}
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-margin-mobile md:px-margin-desktop py-stack-lg flex justify-center">
        <div className="w-full max-w-3xl flex flex-col gap-stack-lg">
          {step === 0 && (
            <StepHeader
              eyebrow={`Step 1 of ${n}`}
              title="Where are you traveling?"
              subtitle="Start with your destination and the type of visa you need."
            />
          )}
          {step === 1 && (
            <StepHeader
              eyebrow={`Step 2 of ${n}`}
              title="Tell us a little more"
              subtitle="These details help label and organize your application."
            />
          )}
          {step === 2 && (
            <StepHeader
              eyebrow={`Step 3 of ${n}`}
              title="Choose your starting documents"
              subtitle="We'll pre-fill your checklist. You can add or remove documents later."
            />
          )}
          {step === 3 && (
            <StepHeader
              eyebrow={`Step 4 of ${n}`}
              title="Review and confirm"
              subtitle="Check everything looks right before we set things up."
            />
          )}

          <div className="bg-surface rounded-xl border border-outline-variant p-gutter shadow-[0_1px_3px_rgba(16,24,40,0.06)] flex flex-col gap-stack-lg">
            {/* STEP 1 */}
            {step === 0 && (
              <>
                <Field label="Destination country" htmlFor="destination">
                  <div className="relative" ref={countryContainerRef}>
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                    <input
                      id="destination"
                      type="text"
                      autoComplete="off"
                      value={countryQuery}
                      onChange={(e) => {
                        setCountryQuery(e.target.value)
                        setDestination(e.target.value)
                        setCountryOpen(true)
                      }}
                      onFocus={() => setCountryOpen(true)}
                      placeholder="Search for a country (e.g. France, USA, Japan)"
                      className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface"
                    />
                    {countryOpen && countryQuery.trim().length > 0 && filteredCountries.length > 0 && (
                      <ul className="absolute z-10 top-full mt-1 w-full bg-surface border border-outline-variant rounded-lg shadow-lg max-h-56 overflow-y-auto py-1">
                        {filteredCountries.map((country) => (
                          <li key={country}>
                            <button
                              type="button"
                              onClick={() => selectCountry(country)}
                              className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container transition-colors"
                            >
                              {country}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Field>

                <Field label="Visa type">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md">
                    {VISA_OPTIONS.map(({ value, label, description, Icon }) => {
                      const active = visaType === value
                      return (
                        <button
                          type="button"
                          key={value}
                          onClick={() => setVisaType(value)}
                          aria-pressed={active}
                          className={`h-full border rounded-lg p-stack-md flex flex-col items-center text-center gap-stack-sm transition-colors ${
                            active
                              ? "border-primary bg-selected ring-1 ring-primary"
                              : "border-outline-variant hover:bg-surface-container"
                          }`}
                        >
                          <Icon className={`w-7 h-7 ${active ? "text-primary" : "text-on-surface-variant"}`} />
                          <div>
                            <div className="font-display text-base font-semibold text-on-surface mb-0.5">
                              {label}
                            </div>
                            <div className="text-xs text-on-surface-variant">{description}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </Field>

                <Field label="Planned travel date" htmlFor="travel_date">
                  <div className="relative">
                    <CalendarToday className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
                    <input
                      id="travel_date"
                      type="date"
                      value={travelDate}
                      onChange={(e) => setTravelDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg font-mono text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface"
                    />
                  </div>
                </Field>
              </>
            )}

            {/* STEP 2 */}
            {step === 1 && (
              <>
                <Field label="Applicant name" htmlFor="applicant">
                  <input
                    id="applicant"
                    type="text"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="Name on the application (optional)"
                    className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface"
                  />
                </Field>
                <Field label="Notes" htmlFor="wiz-notes">
                  <textarea
                    id="wiz-notes"
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything you want to remember about this application…"
                    className="w-full p-4 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none text-on-surface"
                  />
                </Field>
              </>
            )}

            {/* STEP 3 */}
            {step === 2 && (
              <div className="flex flex-col gap-stack-md">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-stack-md">
                  {STARTER_DOCS.map(({ name }) => {
                    const active = selectedDocs.includes(name)
                    return (
                      <div
                        key={name}
                        className={`rounded-lg border transition-colors ${
                          active ? "border-primary bg-selected" : "border-outline-variant"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleDoc(name)}
                          aria-pressed={active}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                            active ? "" : "hover:bg-surface-container"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 ${
                              active ? "bg-primary border-primary text-on-primary" : "border-outline"
                            }`}
                          >
                            {active && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                          </span>
                          <span className="text-sm text-on-surface">{name}</span>
                        </button>
                        {active && (
                          <div className="px-4 pb-3">
                            <input
                              type="text"
                              value={docNotes[name] ?? ""}
                              onChange={(e) => setDocNotes((prev) => ({ ...prev, [name]: e.target.value }))}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Add a note (optional)"
                              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-md text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {customDocs.length > 0 && (
                  <div className="flex flex-col gap-stack-md">
                    {customDocs.map((doc) => (
                      <div key={doc.id} className="rounded-lg border border-primary bg-selected">
                        <div className="flex items-center gap-3 px-4 py-3">
                          <span
                            aria-hidden="true"
                            className="w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 bg-primary border-primary text-on-primary"
                          >
                            <Check className="w-3.5 h-3.5" strokeWidth={3} />
                          </span>
                          <span className="text-sm text-on-surface flex-1">{doc.name}</span>
                          <button
                            type="button"
                            onClick={() => removeCustomDoc(doc.id)}
                            aria-label={`Remove ${doc.name}`}
                            className="text-on-surface-variant hover:text-error transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="px-4 pb-3">
                          <input
                            type="text"
                            value={doc.note}
                            onChange={(e) => updateCustomDocNote(doc.id, e.target.value)}
                            placeholder="Add a note (optional)"
                            className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-md text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-stack-sm">
                  <input
                    type="text"
                    value={customDocName}
                    onChange={(e) => setCustomDocName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addCustomDoc()
                      }
                    }}
                    placeholder="Add a custom document…"
                    className="flex-1 px-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface"
                  />
                  <button
                    type="button"
                    onClick={addCustomDoc}
                    disabled={!customDocName.trim()}
                    className="px-4 py-3 text-sm font-semibold text-primary border border-outline-variant rounded-lg hover:bg-surface-container transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {step === 3 && (
              <dl className="flex flex-col">
                <ReviewRow label="Destination" value={destination || "—"} />
                <ReviewRow label="Visa type" value={visaLabel} />
                <ReviewRow
                  label="Planned travel"
                  value={
                    travelDate
                      ? new Date(travelDate + "T00:00:00")
                          .toLocaleDateString(undefined, {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                          .toUpperCase()
                      : "Not set"
                  }
                />
                <ReviewRow label="Documents" value={`${totalDocs} selected`} />
                {applicantName.trim() && <ReviewRow label="Applicant" value={applicantName.trim()} />}
                {notes.trim() && <ReviewRow label="Notes" value={notes.trim()} />}
              </dl>
            )}

            {error && (
              <p className="text-sm text-on-error-container bg-error-container rounded-lg px-3 py-2" role="alert">
                {error}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-stack-md">
            <button
              onClick={() => (step === 0 ? router.push("/dashboard") : setStep((s) => s - 1))}
              className="px-6 py-3 text-sm font-semibold text-primary rounded-lg hover:bg-surface-container transition-colors"
            >
              {step === 0 ? "Cancel" : "Back"}
            </button>

            {step < n - 1 ? (
              <button
                onClick={() => canProceed() && setStep((s) => s + 1)}
                disabled={!canProceed()}
                className="px-6 py-3 text-sm font-semibold text-on-primary bg-primary rounded-lg hover:bg-primary-container transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={saving}
                className="px-6 py-3 text-sm font-semibold text-on-primary bg-primary rounded-lg hover:bg-primary-container transition-colors flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? "Creating…" : "Create application"}
                <Check className="w-4 h-4" strokeWidth={3} />
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

function StepHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-on-surface-variant mb-2">
        {eyebrow}
      </p>
      <h1 className="font-display text-[32px] leading-[1.15] font-extrabold text-on-background mb-stack-sm text-balance">
        {title}
      </h1>
      <p className="text-base text-on-surface-variant text-pretty">{subtitle}</p>
    </div>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-stack-sm">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-on-surface">
        {label}
      </label>
      {children}
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline gap-4 py-3 border-b border-outline-variant last:border-0">
      <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-on-surface-variant">{label}</dt>
      <dd className="text-sm font-medium text-on-surface text-right">{value}</dd>
    </div>
  )
}
