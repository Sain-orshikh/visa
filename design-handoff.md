# Visa Tracker — the flows that stay

**Redesign handoff · functional baseline**

Every screen is open to a new look. What follows is the behaviour underneath it — the steps, states,
and rules the product depends on. Design around these; nothing here is a visual instruction.

8 screens · 4-step wizard · 2 document states · 5 deadline levels · 3 storage modes

---

## What the product actually does

A traveller creates one application per visa, gets a checklist of documents to collect, and works
that checklist down to zero — uploading a file, or ticking off the paper-only items by hand. The app
never submits anything to an embassy. Its whole job is: nothing is missing on the day you apply.

---

## Screen map

| Route | Job |
| --- | --- |
| `/` | Redirects: signed in → dashboard, otherwise → login. |
| `/login` | Email and password. Links across to register. |
| `/register` | Name, email, password (8+). Links across to login. |
| `/dashboard` | The home screen: application list, progress, checklist. |
| `/new` | Four-step wizard that creates an application and seeds its checklist. |
| `/settings` | Profile, storage, categories, archive, theme, password, delete account. |
| `/support` | FAQ, contact form, past tickets. |
| modals | Add or edit a document, and the file viewer — both open over the dashboard. |

---

## Getting in

Deliberately thin. There is no marketing page, no onboarding tour, no email verification.

**1. Register or sign in.** Register takes full name, email, and a password of at least 8 characters.
Sign in takes email and password. Both are a single form with one submit button, and errors show
inline above it. Each screen must offer the way across to the other one.

**2. Land on the dashboard.** Success goes straight to `/dashboard` — no interstitial. The session
lasts 30 days, so there is no "remember me" choice to design.

**3. Sign out.** Reachable from the dashboard navigation at all times, and returns to `/login`.

---

## Creating an application

A real four-step sequence with back and forward movement. Only step 1 has a required field, so the
user can move fast.

**1. Destination.** Country search with type-ahead suggestions; visa type as three choices —
Tourist, Business, Student; and a planned travel date.
*Gate: a destination is required to continue. Everything else is optional.*

**2. Details.** Applicant name and a free-text notes field. Both optional.

**3. Documents.** Six starter documents, four of them pre-selected. Each selected one can carry an
optional note. The user can also add their own documents to the list and remove them again.
*Starter set: Passport Copy, Bank Statements, Flight Itinerary, Travel Insurance, Proof of
Accommodation, Employment Letter.*

**4. Review.** A read-back of destination, visa type, planned travel, document count, and any
applicant name or notes. The final action creates the application with its checklist, then returns to
the dashboard with the new application selected.

The application is named automatically as `{Country} {Type} Visa` — the user is never asked for a
name. Cancelling at any step returns to the dashboard and creates nothing.

---

## The dashboard

Three things, in this order of priority: which application, how far along, what is left.

- **Application switcher.** A list of the user's active applications, one of which is always
  selected. Each entry shows the application name and a count of outstanding documents. Archived
  applications never appear here — they live in Settings. Alongside it: a persistent "start a new
  visa" action, plus Settings, Support, theme, and sign out.
- **Application header.** Name, visa type, applicant, target entry date, and any notes.
- **Progress.** A percentage plus the raw ratio, "*x* of *y* documents". Both must be present; the
  number is what users check first.
- **Phase indicator.** Three phases: Gathering while anything is outstanding, Review once everything
  is in, and Submission, always upcoming and never reached — the app does not submit.
- **Checklist.** Everything below the header, covered next.
- **Add document.** Available from the header at every screen width.

### Two states that need designing

- **No applications yet:** an empty state that explains the product in a line and points at the
  wizard. This is the closest thing to onboarding the app has.
- **Loading an application:** a skeleton, shown when applications exist but the selected one has not
  arrived yet.

---

## Working the checklist

The core screen. A document is either outstanding or on file, and the split between the two is the
organising idea.

### Outstanding, grouped by category

Outstanding documents are grouped under their category, most urgent first inside each group.
Categories are Identity, Financial, Travel, then any the user created, then Other as the catch-all —
always last. Each group shows its own count.

Every outstanding row carries, at minimum:

- Document name, and its description when there is one.
- A deadline chip, or an invitation to set one. Tapping it edits the date in place.
- **Upload files** — the primary action. Accepts several files at once (PDFs and images) and shows a
  busy state while uploading.
- **Mark done** — for documents that only exist on paper. Completes the row with no file attached.
- An overflow menu: edit details, move to a folder, delete.
- Upload errors appear on the row itself, not as a global message.

### On file, collapsed and quiet

Completed documents sit in one collapsible group titled "On file", below everything outstanding. It
should read as settled rather than compete for attention. Those rows can still view their files, add
more, un-tick a manually completed item, and use the same overflow menu. When every document is
complete, a full-width confirmation replaces the outstanding groups.

### Folders, optional

Users can create folders inside an application and drag documents into them, or move them via the row
menu — both paths must exist, since drag alone fails on touch. Folders can be renamed in place and
deleted, which returns their documents to the top level. Applications with no folders keep the flat,
category-grouped list.

### Deadline levels

Five levels, computed from today. They drive the emphasis of a row, so they need visibly distinct
treatments — not colour alone.

| Level | When | Reads as |
| --- | --- | --- |
| Overdue | Deadline has passed | "3 days overdue" |
| Today | Due today | "Due today" |
| Soon | Within 7 days | "Due in 4 days" |
| Scheduled | More than 7 days out | "Due 14 Mar" |
| None | No deadline set | Offers to set one |

---

## Document editor

One dialog serves both adding and editing; only the title and the confirm label differ.

- **Document name** — the only required field.
- **Deadline** — a date, optional.
- **Category** — the built-ins plus the user's own; defaults to Other.
- **Folder** — shown only when the application has folders.
- **Notes** — free text for requirements worth remembering.
- Cancel and save, with a busy state on save. Escape and clicking outside both close it.

---

## File viewer

Opened from any document that has files. A document can hold several.

- A list of the document's files; selecting one previews it.
- Preview handles images inline and PDFs in a frame, plus a link to open the file in a new tab.
- Add more files, and delete individual files, from inside the viewer.
- An empty state, since deleting the last file leaves the viewer open.

---

## Settings

A single scrolling page of independent sections, each saving on its own. Their order matters less
than the fact that all seven are present.

| Section | What it does |
| --- | --- |
| Profile | Change display name and email. |
| File storage | Choose where uploads live: the app's shared storage, the user's own Cloudinary (cloud name, API key, secret), or their Google Drive (connect by OAuth, shows the connected account). Options can be unavailable depending on the deployment, and each needs a "currently in use" state, a disconnect path, and room for a warning about public links. |
| Categories | Add and remove custom document categories. The three built-ins cannot be removed. |
| Your visas | Archive an application, which clears it off the dashboard but keeps everything, or delete it permanently behind a confirm step. Active and archived are listed separately, and archived ones can be restored. |
| Appearance | Light, dark, or follow the system — an explicit three-way choice. |
| Security | Change password: current, new, confirm. |
| Danger zone | Delete the account, confirmed by password. Visibly separated from everything above it. |

---

## Support

Three stacked sections on one page.

- **Common questions** — six FAQs as an accordion, one open at a time.
- **Contact** — category, subject, message. The categories are documents and uploads, my account,
  billing, something is broken, something else.
- **Your tickets** — past submissions with category, date, and open or closed status.

---

## Rules that hold everywhere

These are load-bearing. If a design makes one of them impossible to express, the design has to move.

- **Progress is uploaded divided by total documents.** Adding a document lowers the percentage. That
  is correct, and users are told so in the FAQ.
- **A document completes two ways** — it has at least one file, or it was ticked off by hand. Both
  read as "on file", and the manual tick survives files being added or removed.
- **Every drag action has a menu equivalent.** Moving documents between folders must work without a
  pointer.
- **Errors appear next to the thing that failed** — on the row, in the form, in the dialog — never as
  a global banner.
- **Destructive actions confirm in place.** Deleting an application asks first; deleting an account
  requires the password.
- **Both themes are real.** Light and dark are equally supported, with system as the default.
- **The dashboard works on a phone.** Navigation collapses to a drawer, and checklist rows reflow
  rather than shrink.

---

## What the redesign is free to change

Everything not listed above, and these in particular.

- All colour, type, spacing, iconography, and the logo treatment.
- The current passport-document styling — the mono labels and the machine-readable band under the
  progress card carry no function.
- Whether navigation is a sidebar, a top bar, or something else, as long as switching applications
  and reaching Settings, Support, theme, and sign out stay one gesture away.
- Whether the document editor and file viewer are dialogs, sheets, or full screens.
- How the wizard expresses progress — a rail, a counter, anything. The four steps and their contents
  stay.
- How grouping, folders, and completed documents are visually expressed. The split between
  outstanding and on file stays.
- All copy, including the FAQ and the empty states.

---

*Baseline captured from the current build · 18 August 2026*
