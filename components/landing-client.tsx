import Link from "next/link"
import { Logo } from "@/components/logo"
import { WorldMap } from "@/components/world-map"

const STEPS = [
  {
    n: "01",
    title: "Pick your route",
    body: "Choose where you're going and the visa type. We load that consulate's steps for you.",
  },
  {
    n: "02",
    title: "Set dates and documents",
    body: "Appointment, travel date, expiry dates. Every requirement becomes a to-do you can tick off.",
  },
  {
    n: "03",
    title: "Watch it move",
    body: "One progress line per application, with a nudge before anything is due.",
  },
]

const COUNTRIES = [
  "Germany",
  "Japan",
  "Canada",
  "Portugal",
  "United Kingdom",
  "Australia",
  "Netherlands",
  "India",
  "Brazil",
]

const FAQS = [
  {
    q: "Is it really free?",
    a: "Yes. Passage doesn't handle your application or charge for it — it keeps track of it.",
  },
  {
    q: "Do you file anything for me?",
    a: "No. You apply through the consulate as usual; we hold the dates, documents and status in one place.",
  },
  {
    q: "Where do my documents live?",
    a: "Checklists are yours alone, encrypted, and you can delete an application and everything in it at any time.",
  },
]

const CHECKLIST_DONE = [
  "Passport scan",
  "Biometric photo",
  "Employment contract",
  "Health insurance",
  "Proof of address",
  "Application form",
]
const CHECKLIST_LEFT = ["Bank statements ·3mo", "Degree certificate", "Cover letter"]

export function LandingClient({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  /* Signed-in visitors still get the landing page; the calls to action point them home instead. */
  const ctaHref = isAuthenticated ? "/dashboard" : "/register"

  return (
    /* The landing page is dark by design — the `dark` class re-declares the
       theme tokens for this subtree, so toggling the theme in the dashboard
       leaves the marketing page looking the way it was drawn. */
    <div className="dark min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="flex items-center justify-between gap-4 px-margin-mobile md:px-margin-desktop py-4 border-b border-outline-variant">
        <div className="flex items-center gap-2.5">
          <Logo size={22} />
          <span className="font-display text-[15px] font-medium tracking-tight">Passage</span>
        </div>
        <nav className="hidden md:flex items-center gap-7 text-sm text-on-surface-variant">
          <a href="#how-it-works" className="hover:text-on-surface transition-colors">
            How it works
          </a>
          <a href="#countries" className="hover:text-on-surface transition-colors">
            Countries
          </a>
          <a href="#faq" className="hover:text-on-surface transition-colors">
            Questions
          </a>
          <Link
            href={ctaHref}
            className="border border-primary text-primary rounded-lg px-3.5 py-2 text-[12.5px] font-medium hover:bg-primary/12 active:bg-primary/20 transition-colors"
          >
            {isAuthenticated ? "Go to dashboard" : "Start tracking — free"}
          </Link>
        </nav>
        <Link
          href={ctaHref}
          className="md:hidden border border-primary text-primary rounded-lg px-3 py-1.5 text-xs font-medium"
        >
          {isAuthenticated ? "Dashboard" : "Start"}
        </Link>
      </header>

      {/* Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-10 px-margin-mobile md:px-margin-desktop py-14 md:py-16 items-center max-w-[1200px] mx-auto">
        <div className="flex flex-col gap-5 items-start">
          <span className="font-mono text-[11px] tracking-widest text-primary uppercase">
            Free visa application tracker
          </span>
          <h1 className="font-display text-5xl md:text-[62px] leading-[1.02] font-medium tracking-tight text-balance max-w-[14ch]">
            Every application, in one calm place.
          </h1>
          <p className="text-base md:text-[16.5px] leading-relaxed text-on-surface-variant max-w-[44ch] text-pretty">
            Set your dates, list the documents each consulate wants, and watch the whole process move
            as a to-do list. Nothing to pay, ever.
          </p>
          <div className="flex flex-wrap gap-3 pt-1.5">
            <Link
              href={ctaHref}
              className="border border-primary text-primary rounded-lg px-5 py-3 text-sm font-medium hover:bg-primary/12 active:bg-primary/20 transition-colors"
            >
              {isAuthenticated ? "Open my dashboard" : "Track my application"}
            </Link>
            {isAuthenticated ? (
              <Link
                href="/new"
                className="border border-outline-variant text-on-surface-variant rounded-lg px-5 py-3 text-sm hover:bg-surface-container transition-colors"
              >
                New application
              </Link>
            ) : (
              <Link
                href="/login"
                className="border border-outline-variant text-on-surface-variant rounded-lg px-5 py-3 text-sm hover:bg-surface-container transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-6 pt-3 font-mono text-xs text-on-surface-variant">
            <span>52 countries</span>
            <span>No card required</span>
            <span>Reminders by email</span>
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
          <div className="flex justify-between px-4 py-3 border-b border-outline-variant font-mono text-[10.5px] tracking-widest text-on-surface-variant uppercase">
            <span>Active routes</span>
            <span className="text-primary">3 in progress</span>
          </div>
          <div className="h-[300px] py-2.5">
            <WorldMap
              land="var(--color-neutral-800)"
              edge="var(--color-outline-variant)"
              accent="var(--primary)"
              markers="-9.1,38.7:LISBON;13.4,52.5:BERLIN;139.7,35.7:TOKYO"
              routes="-9.1,38.7>13.4,52.5;13.4,52.5>139.7,35.7"
              draw
              spark
            />
          </div>
          <div className="grid grid-cols-3 border-t border-outline-variant">
            <div className="px-4 py-3.5 border-r border-outline-variant">
              <div className="font-mono text-[10px] text-on-surface-variant">GERMANY · WORK</div>
              <div className="text-[13px] font-medium mt-1.5">Biometrics Sep 4</div>
            </div>
            <div className="px-4 py-3.5 border-r border-outline-variant">
              <div className="font-mono text-[10px] text-on-surface-variant">JAPAN · STUDENT</div>
              <div className="text-[13px] font-medium mt-1.5">2 documents left</div>
            </div>
            <div className="px-4 py-3.5">
              <div className="font-mono text-[10px] text-on-surface-variant">PORTUGAL · D7</div>
              <div className="text-[13px] font-medium mt-1.5 text-primary">Decision pending</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-outline-variant px-margin-mobile md:px-margin-desktop py-14 max-w-[1200px] mx-auto">
        <h2 className="font-mono text-[13px] tracking-widest text-on-surface-variant uppercase mb-8">
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-outline-variant rounded-lg overflow-hidden">
          {STEPS.map((step) => (
            <div key={step.n} className="bg-background p-7 flex flex-col gap-2.5">
              <span className="font-display text-2xl font-medium text-accent-800">{step.n}</span>
              <span className="font-display text-lg font-medium">{step.title}</span>
              <span className="text-sm leading-relaxed text-on-surface-variant text-pretty">
                {step.body}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Live status + checklist sample */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-9 px-margin-mobile md:px-margin-desktop pb-14 max-w-[1200px] mx-auto">
        <div className="bg-surface-container border border-outline-variant rounded-xl p-6">
          <div className="font-mono text-[10.5px] tracking-widest text-on-surface-variant uppercase mb-4.5">
            Live status · Germany work visa
          </div>
          <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden mb-5">
            <div className="w-[62%] h-full bg-primary rounded-full" />
          </div>
          <div className="flex flex-col gap-3.5">
            <StatusRow label="Application submitted" date="Jul 22" state="done" />
            <StatusRow label="Appointment booked" date="Aug 09" state="done" />
            <StatusRow label="Biometrics appointment" date="Sep 04" state="now" />
            <StatusRow label="Decision" date="Est. Oct" state="later" />
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant rounded-xl p-6">
          <div className="font-mono text-[10.5px] tracking-widest text-on-surface-variant uppercase mb-4.5">
            Document checklist · 6 of 9
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
            {CHECKLIST_DONE.map((item) => (
              <span key={item} className="text-[13.5px] text-on-surface-variant line-through">
                {item}
              </span>
            ))}
            {CHECKLIST_LEFT.map((item) => (
              <span key={item} className="text-[13.5px] text-on-surface font-medium">
                {item}
              </span>
            ))}
          </div>
          <div className="mt-5 pt-4.5 border-t border-outline-variant text-[12.5px] leading-relaxed text-on-surface-variant text-pretty">
            Requirements differ by consulate, so each checklist is built from the one you&rsquo;re
            actually applying to.
          </div>
        </div>
      </section>

      {/* Pricing / stat band — the one place saturation is allowed to flood */}
      <section
        className="px-margin-mobile md:px-margin-desktop py-14 flex flex-col md:flex-row md:items-end justify-between gap-9"
        style={{
          background: "linear-gradient(180deg, var(--color-section), var(--color-section-glow))",
        }}
      >
        <div>
          <div className="font-mono text-[11px] tracking-widest text-accent-300 mb-3.5">PRICING</div>
          <div className="font-display text-3xl md:text-[46px] leading-[1.05] tracking-tight text-neutral-100 font-medium">
            Free to use.
            <br />
            No card, no tier, no trial.
          </div>
        </div>
        <div className="flex flex-col gap-3 items-start md:items-end shrink-0">
          <Link
            href={ctaHref}
            className="border border-accent-400 text-neutral-100 rounded-lg px-6 py-3 text-sm font-medium hover:bg-white/10 transition-colors"
          >
            {isAuthenticated ? "Back to my tracker" : "Create a free tracker"}
          </Link>
          <span className="font-mono text-xs text-accent-300">We never charge for reminders</span>
        </div>
      </section>

      {/* Countries + FAQ */}
      <section
        id="countries"
        className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-11 px-margin-mobile md:px-margin-desktop py-14 max-w-[1200px] mx-auto"
      >
        <div>
          <h2 className="font-mono text-[13px] tracking-widest text-on-surface-variant uppercase mb-5">
            Supported countries
          </h2>
          <div className="flex flex-wrap gap-2 max-w-[420px]">
            {COUNTRIES.map((c) => (
              <span
                key={c}
                className="border border-outline-variant rounded-full px-3.5 py-1.5 text-[12.5px] text-on-surface-variant"
              >
                {c}
              </span>
            ))}
            <span className="border border-primary-fixed rounded-full px-3.5 py-1.5 text-[12.5px] text-primary">
              +43 more
            </span>
          </div>
        </div>
        <div id="faq">
          <h2 className="font-mono text-[13px] tracking-widest text-on-surface-variant uppercase mb-5">
            Questions
          </h2>
          <div className="flex flex-col">
            {FAQS.map((faq) => (
              <div key={faq.q} className="py-4 border-t border-outline-variant last:border-b">
                <div className="font-display text-[15px] font-medium">{faq.q}</div>
                <div className="text-[13.5px] leading-relaxed text-on-surface-variant mt-1.5 text-pretty">
                  {faq.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-margin-mobile md:px-margin-desktop py-8 border-t border-outline-variant flex flex-wrap items-center justify-between gap-3 max-w-[1200px] mx-auto">
        <div className="flex items-center gap-2.5 text-on-surface-variant">
          <Logo size={18} />
          <span className="text-sm">Passage</span>
        </div>
        <span className="font-mono text-xs text-on-surface-variant">know exactly where it stands</span>
      </footer>
    </div>
  )
}

function StatusRow({
  label,
  date,
  state,
}: {
  label: string
  date: string
  state: "done" | "now" | "later"
}) {
  return (
    <div className="flex items-center gap-3">
      {state === "done" ? (
        <span className="w-[18px] h-[18px] rounded-full bg-primary-fixed text-on-primary-container text-[11px] font-medium flex items-center justify-center shrink-0">
          ✓
        </span>
      ) : state === "now" ? (
        <span className="w-[18px] h-[18px] rounded-full border-[1.5px] border-primary animate-pulse shrink-0" />
      ) : (
        <span className="w-[18px] h-[18px] rounded-full border-[1.5px] border-outline-variant shrink-0" />
      )}
      <span
        className={`text-sm ${state === "now" ? "font-medium text-on-surface" : "text-on-surface-variant"}`}
      >
        {label}
      </span>
      <span className="ml-auto font-mono text-[11px] text-on-surface-variant">{date}</span>
    </div>
  )
}
