"use client"

import { useState } from "react"
import useSWR from "swr"
import { Check, ChevronDown, Loader2, TriangleAlert } from "lucide-react"
import { PageShell, SectionCard } from "@/components/page-shell"
import { api, fetcher } from "@/lib/api"
import type { SupportCategory, SupportTicket } from "@/lib/types"

const FIELD =
  "w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface text-sm placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"

const LABEL = "text-sm font-semibold text-on-surface"

const CATEGORIES: { value: SupportCategory; label: string }[] = [
  { value: "documents", label: "Documents and uploads" },
  { value: "account", label: "My account" },
  { value: "billing", label: "Billing" },
  { value: "bug", label: "Something is broken" },
  { value: "other", label: "Something else" },
]

const CATEGORY_LABELS: Record<SupportCategory, string> = CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.value]: c.label }),
  {} as Record<SupportCategory, string>,
)

const FAQS: { question: string; answer: string }[] = [
  {
    question: "Does Visa Tracker submit my application for me?",
    answer:
      "No. It keeps your checklist, deadlines, and documents in one place so nothing is missing when you go to apply. You still submit through the embassy or application centre yourself.",
  },
  {
    question: "What file types can I upload?",
    answer:
      "Images and PDFs work best. Each document slot holds one file — re-uploading replaces what is there, so keep the most recent version of anything you re-issue.",
  },
  {
    question: "How is the progress percentage calculated?",
    answer:
      "It is the share of documents on the checklist that have a file uploaded. Adding a new document lowers the percentage until you upload something against it, which is expected.",
  },
  {
    question: "Can I add documents that are not on the starter checklist?",
    answer:
      "Yes. Use “Add document” on any application to add your own item, with its own description and deadline. Requirements vary by consulate, so the starter list is a beginning, not the whole of it.",
  },
  {
    question: "What happens to my files if I delete an application?",
    answer:
      "The application, its checklist, and the files uploaded against it are all removed. There is no undo, so download anything you still need first.",
  },
  {
    question: "Is my data shared with anyone?",
    answer:
      "No. Your applications and documents are visible only to your account. Deleting your account from Settings removes them along with the uploaded files.",
  },
]

export function SupportClient() {
  return (
    <PageShell
      title="Support"
      eyebrow="Help"
      description="Answers to the usual questions, and a way to reach us when they are not enough."
    >
      <FaqSection />
      <ContactSection />
      <TicketsSection />
    </PageShell>
  )
}

/* -------------------------------------------------------------------- faq */

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <SectionCard title="Common questions">
      <ul className="flex flex-col divide-y divide-outline-variant -my-2">
        {FAQS.map((faq, i) => {
          const open = openIndex === i
          return (
            <li key={faq.question} className="py-2">
              <h3>
                <button
                  onClick={() => setOpenIndex(open ? null : i)}
                  aria-expanded={open}
                  className="w-full flex items-start justify-between gap-4 text-left py-2.5 group"
                >
                  <span className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 mt-0.5 flex-shrink-0 text-on-surface-variant transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </h3>
              {open && (
                <p className="text-sm text-on-surface-variant pb-2.5 pr-8 text-pretty leading-relaxed">
                  {faq.answer}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </SectionCard>
  )
}

/* ---------------------------------------------------------------- contact */

function ContactSection() {
  const { mutate } = useSWR<{ tickets: SupportTicket[] }>("/api/support", fetcher)
  const [category, setCategory] = useState<SupportCategory>("documents")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSending(true)
    try {
      await api.createSupportTicket({ category, subject, message })
      setSuccess("Request sent. You will find it listed below.")
      setSubject("")
      setMessage("")
      mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setSending(false)
    }
  }

  return (
    <SectionCard
      title="Contact us"
      description="Tell us what is going on and we will pick it up from your account."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md">
        <div className="flex flex-col gap-stack-sm">
          <label htmlFor="support-category" className={LABEL}>
            Category
          </label>
          <select
            id="support-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as SupportCategory)}
            className={FIELD}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-stack-sm">
          <label htmlFor="support-subject" className={LABEL}>
            Subject
          </label>
          <input
            id="support-subject"
            type="text"
            required
            maxLength={120}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Upload keeps failing on my bank statement"
            className={FIELD}
          />
        </div>

        <div className="flex flex-col gap-stack-sm">
          <label htmlFor="support-message" className={LABEL}>
            Message
          </label>
          <textarea
            id="support-message"
            required
            rows={5}
            maxLength={4000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What were you doing, and what happened instead?"
            className={`${FIELD} resize-y min-h-32`}
          />
          <p className="text-xs text-on-surface-variant">
            {message.length}/4000 characters. Please leave out passwords and full passport numbers.
          </p>
        </div>

        {error && (
          <p
            className="text-sm text-on-error-container bg-error-container rounded-lg px-3 py-2 flex items-start gap-2"
            role="alert"
          >
            <TriangleAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </p>
        )}
        {success && (
          <p
            className="text-sm text-on-success-container bg-success-container rounded-lg px-3 py-2 flex items-start gap-2"
            role="status"
          >
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {success}
          </p>
        )}

        <div>
          <button
            type="submit"
            disabled={sending}
            className="px-5 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {sending && <Loader2 className="w-4 h-4 animate-spin" />}
            {sending ? "Sending…" : "Send request"}
          </button>
        </div>
      </form>
    </SectionCard>
  )
}

/* ---------------------------------------------------------------- tickets */

function formatDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase()
}

function TicketsSection() {
  const { data, isLoading } = useSWR<{ tickets: SupportTicket[] }>("/api/support", fetcher)
  const tickets = data?.tickets ?? []

  return (
    <SectionCard title="Your requests" description="Everything you have sent us, newest first.">
      {isLoading ? (
        <div className="flex flex-col gap-2 animate-pulse" aria-busy="true">
          <div className="h-16 rounded-lg bg-surface-container" />
          <div className="h-16 rounded-lg bg-surface-container" />
        </div>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-on-surface-variant">
          You have not sent any support requests yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-stack-sm">
          {tickets.map((ticket) => (
            <li
              key={ticket.id}
              className="rounded-lg border border-outline-variant bg-surface-container-low p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-on-surface min-w-0">{ticket.subject}</p>
                <span
                  className={`font-mono text-[10px] uppercase tracking-[0.12em] px-2 py-1 rounded flex-shrink-0 ${
                    ticket.status === "open"
                      ? "bg-warning-container text-on-warning-container"
                      : "bg-success-container text-on-success-container"
                  }`}
                >
                  {ticket.status}
                </span>
              </div>
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-on-surface-variant mt-1.5">
                {CATEGORY_LABELS[ticket.category] ?? ticket.category} · {formatDate(ticket.createdAt)}
              </p>
              <p className="text-sm text-on-surface-variant mt-2 whitespace-pre-wrap text-pretty">
                {ticket.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
