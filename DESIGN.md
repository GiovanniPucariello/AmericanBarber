# American Barber Tattoo — Technical Design Document

Status: pre-implementation deliverable (spec section 100). No code has been
written yet. This document is the basis for the phased build in Section N.

---

## A. Product Analysis

American Barber Tattoo is a barber shop / tattoo studio that needs a booking
product. Three actors, three jobs:

- **Customer** — wants the fastest possible path from "I need a haircut" to
  "I have a confirmed slot," on a phone, in one hand, in a few taps. Secondary
  job: set up a standing weekly/biweekly appointment once and stop thinking
  about it.
- **Hairdresser** — wants to see today at a glance, act on new requests in one
  tap, and control their own availability without calling the owner.
- **Admin/Owner** — wants to configure the shop (staff, services, hours,
  branding) without needing a developer, and trust that the booking engine
  won't double-book or leak one customer's data to another.

The product is explicitly **not** a generic scheduling SaaS with a barber shop
skin. The interpretation driving every decision below: build the generic
capability (multi-tenant, configurable services, pluggable notification
channels) as *invisible infrastructure*, and spend the visible design budget
entirely on making this feel like American Barber Tattoo's own app.

The non-negotiable constraints carried through every later section:
mobile-first, zero double-booking, recurring bookings as first-class (not
bolted on), RLS-enforced multi-tenancy, and a hard visual split between rich
branding and minimal UX (spec section 4).

---

## B. Architecture

```
Platform
│
└── Organization  (tenant)                e.g. "American Barber Tattoo"
    ├── Branding            (logo, colors, favicon — stored as org fields)
    ├── Locations           (1 today, N in future)
    │   └── Hairdressers    (staff working at a location)
    ├── Services            (name, duration, price — org-scoped)
    ├── Members             (organization_members: who has what role here)
    │   ├── customer
    │   ├── hairdresser
    │   ├── manager
    │   ├── admin
    │   └── owner
    ├── Availability
    │   ├── availability_rules       (recurring weekly hours per hairdresser)
    │   ├── availability_exceptions  (vacation, sick day, one-off closure)
    │   └── blocked_slots            (manual one-off block)
    ├── Appointments        (single bookings — the booking engine's output)
    ├── Recurring
    │   ├── recurring_bookings             (the rule)
    │   └── recurring_booking_occurrences  (materialized instances)
    ├── Notifications
    │   ├── notification_events    (channel-agnostic event log)
    │   └── notifications          (per-user delivery record)
    └── Audit Log
```

**Tenant resolution.** A request resolves to an `organization_id` through,
in order of preference: (1) an authenticated user's active membership when
there's exactly one, or a selected org in session when there are several;
(2) a `slug` in the URL path (`/o/[slug]/...`) for the MVP; (3) reserved for
later — subdomain/custom domain lookup against an `organization_domains`
table. Nothing in application code ever branches on an organization's name
or slug — see section 12 of the spec and the coding rule in section H.

**Request flow for a state-changing action** (the shape every mutation
follows):

```
UI (client component)
  → Server Action (Next.js)
      → Zod validation (input shape)
      → Authorization check (role + org membership, re-derived server-side)
      → Domain service (lib/bookings, lib/recurring, lib/availability)
          → Supabase client (service-role only where RLS genuinely can't
            express the rule, e.g. cross-tenant admin tooling — otherwise
            the user's own session client, so RLS is the enforcement, not
            a courtesy)
              → PostgreSQL (constraints are the final authority)
      → audit_logs insert
      → notification_events insert
  ← typed result / typed error
```

The frontend never decides "is this slot free" as the final word — it only
renders what the server returned and reacts to a `409`-style conflict
response by re-fetching availability (section 22/51 of the spec).

---

## C. Database

PostgreSQL via Supabase. All tables below (except `profiles`, which is
identity, not tenant data) carry `organization_id uuid not null references
organizations(id)` and are covered by RLS. Timestamps are `timestamptz`;
"date-only" fields are `date`; all times are stored in UTC and rendered in
the organization's `timezone`.

### organizations
Tenant root.
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| name | text | "American Barber Tattoo" |
| slug | text unique | url-safe, e.g. `american-barber-tattoo` |
| logo_url | text | |
| favicon_url | text | |
| primary_color | text | hex |
| secondary_color | text | hex |
| accent_color | text | hex |
| timezone | text | default `Europe/Rome` |
| locale | text | default `it-IT` |
| settings | jsonb | `booking_interval_minutes`, `cancellation_cutoff_hours`, `reminder_offsets_minutes`, etc. — see section M99 defaults below |
| created_at / updated_at | timestamptz | |

### profiles
User identity, one row per Supabase Auth user. **Not** org-scoped — a person
is one identity that can belong to many organizations.
| column | type | notes |
|---|---|---|
| id | uuid pk | = `auth.users.id` |
| full_name | text | |
| phone | text | nullable |
| avatar_url | text | |
| created_at / updated_at | timestamptz | |

### organization_members
The membership + role join table. This is the single source of truth for
"who can do what, where" — never inferred from `profiles` alone.
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| organization_id | uuid fk | |
| profile_id | uuid fk → profiles | |
| role | enum: customer, hairdresser, manager, admin, owner | |
| active | boolean | default true (soft-disable instead of delete) |
| created_at | timestamptz | |
| unique(organization_id, profile_id, role) | | a person could in theory hold two roles at one org (e.g. hairdresser who is also owner) |

### hairdressers
A staff member's *professional profile*, distinct from their membership row
(a hairdresser needn't have login access on day one).
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| organization_id | uuid fk | |
| profile_id | uuid fk → profiles, nullable | null until they're invited to log in |
| display_name | text | "Angelo" |
| avatar_url | text | |
| bio | text | nullable |
| active | boolean | |
| sort_order | int | |
| created_at / updated_at | timestamptz | |

### locations
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| organization_id | uuid fk | |
| name | text | "American Barber Tattoo — Main" |
| address | text | |
| timezone | text | overrides org default if needed |
| active | boolean | |

### services
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| organization_id | uuid fk | |
| name | text | "Taglio", "Barba", "Taglio + Barba" |
| description | text | nullable |
| duration_minutes | int | not hardcoded elsewhere |
| price_cents | int | nullable for MVP display |
| active | boolean | |
| sort_order | int | |

### hairdresser_services (join, many-to-many)
Not every hairdresser offers every service.
| column | type | notes |
|---|---|---|
| hairdresser_id | uuid fk | |
| service_id | uuid fk | |
| primary key (hairdresser_id, service_id) | | |

### availability_rules
Recurring weekly template.
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| organization_id | uuid fk | |
| hairdresser_id | uuid fk | |
| location_id | uuid fk | |
| weekday | smallint | 0=Mon..6=Sun |
| start_time | time | |
| end_time | time | |
| active | boolean | |

### availability_exceptions
One-off overrides to the rule: vacation, sick day, "closed this day", or an
*extra* availability window.
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| organization_id | uuid fk | |
| hairdresser_id | uuid fk | |
| date | date | |
| type | enum: unavailable_all_day, unavailable_range, extra_range | |
| start_time / end_time | time, nullable | required for range types |
| reason | text | nullable, e.g. "Ferie" |

### blocked_slots
Manual ad-hoc block, e.g. "Friday 17:30–18:30 blocked for a personal
appointment" — distinct from `availability_exceptions` in that it's a direct
calendar action, not a schedule change.
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| organization_id | uuid fk | |
| hairdresser_id | uuid fk | |
| during | tstzrange | |
| reason | text | nullable |
| created_by | uuid fk → profiles | |

### appointments
The booking engine's single source of truth. Both one-off bookings and
materialized recurring occurrences resolve to a row here once confirmed.
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| organization_id | uuid fk | |
| location_id | uuid fk | |
| hairdresser_id | uuid fk | |
| customer_profile_id | uuid fk → profiles | |
| service_id | uuid fk | |
| during | tstzrange not null | `[start, end)`, derived from start + service duration at creation time |
| status | enum: pending, confirmed, rejected, cancelled, completed, no_show | |
| recurring_occurrence_id | uuid fk → recurring_booking_occurrences, nullable | set when this appointment originated from a recurrence |
| created_by | uuid fk → profiles | who initiated it (customer, or hairdresser/admin on their behalf) |
| cancelled_at / cancelled_by | timestamptz / uuid, nullable | |
| notes | text | nullable |
| created_at / updated_at | timestamptz | |

Constraint (the double-booking guard, detailed in section E):
```sql
create extension if not exists btree_gist;

alter table appointments
  add constraint no_overlapping_appointments
  exclude using gist (
    hairdresser_id with =,
    during with &&
  )
  where (status in ('pending', 'confirmed'));
```

### recurring_bookings
The **rule**.
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| organization_id | uuid fk | |
| customer_profile_id | uuid fk | |
| hairdresser_id | uuid fk | |
| service_id | uuid fk | |
| weekday | smallint | |
| start_time | time | |
| interval_weeks | int | 1 = every week, 2 = every 2 weeks, etc. |
| starts_on | date | |
| ends_on | date, nullable | null = open-ended (bounded by a rolling generation horizon, not truly infinite) |
| occurrence_count | int, nullable | alternative to `ends_on` |
| status | enum: pending_approval, active, rejected, cancelled | |
| requested_at | timestamptz | |
| decided_at / decided_by | timestamptz / uuid, nullable | |

### recurring_booking_occurrences
The **materialized instances** of a rule — this is what makes "cancel just
this Friday" different from "cancel the whole rule" (spec sections 28/31/32).
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| recurring_booking_id | uuid fk | |
| organization_id | uuid fk | denormalized for RLS simplicity |
| occurrence_date | date | |
| appointment_id | uuid fk → appointments, nullable | set once materialized into a real appointment |
| status | enum: scheduled, confirmed, conflict, cancelled, skipped, rescheduled, completed, no_show | |
| conflict_reason | text, nullable | e.g. "hairdresser unavailable" |
| created_at / updated_at | timestamptz | |
| unique(recurring_booking_id, occurrence_date) | | |

### notification_events
Channel-agnostic event log — one row per business event, independent of how
(or whether) it's delivered.
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| organization_id | uuid fk | |
| type | enum: booking_created, booking_confirmed, booking_rejected, booking_cancelled, recurring_request_created, recurring_request_approved, recurring_request_rejected, reminder_24h, reminder_1h, schedule_changed | |
| appointment_id / recurring_booking_id | uuid, nullable | whichever applies |
| payload | jsonb | rendering data |
| created_at | timestamptz | |

### notifications
Per-recipient delivery record (fan-out from an event to N recipients / M
channels).
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| notification_event_id | uuid fk | |
| recipient_profile_id | uuid fk | |
| channel | enum: email, push, sms, whatsapp (only `email` implemented in MVP) | |
| status | enum: pending, sent, failed, read | |
| sent_at / read_at | timestamptz, nullable | |

### audit_logs
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| organization_id | uuid fk | |
| actor_profile_id | uuid fk, nullable | null for system-initiated |
| action | text | e.g. `appointment_created`, `recurring_booking_approved` |
| entity_type / entity_id | text / uuid | |
| metadata | jsonb | |
| created_at | timestamptz | |

**Why `services` is separate from `appointments` from day one:** durations
today are uniformly 30 minutes, but the moment a second service exists with a
different duration, every place that assumed 30 minutes has to be found and
fixed. Modeling `duration_minutes` on `services` and deriving `during` from
it means the booking/recurring engines never hardcode a duration — this is
called out explicitly in the spec's own follow-up notes.

---

## D. Row Level Security Strategy

Core principle: **`organization_members` is the only source of truth for
"can this request see/touch this row,"** checked via a `SECURITY DEFINER`
helper function (to avoid recursive RLS lookups and to keep policies
readable):

```sql
create or replace function public.is_org_member(org_id uuid, min_role text default null)
returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from organization_members m
    where m.organization_id = org_id
      and m.profile_id = auth.uid()
      and m.active
      and (min_role is null or m.role = any(role_hierarchy_at_or_above(min_role)))
  );
$$;
```

(`role_hierarchy_at_or_above` is a small SQL function mapping
`customer < hairdresser < manager < admin < owner` — kept as a function, not
duplicated per-policy, so the hierarchy is defined once.)

Policy pattern applied per table, tuned per role:

- **organizations**: readable by any member; writable by `admin`/`owner` only.
- **hairdressers, services, locations, availability_rules**: readable by any
  member of the org (customers need this to build the booking UI); writable
  by `admin`/`owner`, and a hairdresser may update *their own*
  `availability_rules`/`availability_exceptions`/`blocked_slots` row (checked
  via `hairdresser_id`'s `profile_id = auth.uid()`).
- **appointments**: a customer can `select`/`insert` their own
  (`customer_profile_id = auth.uid()`) and `update` only to move their own
  row to `cancelled`; a hairdresser can `select`/`update` rows where
  `hairdresser_id` maps to their own profile; `admin`/`owner` can
  `select`/`update` any row in their org. No role can `update` `status` into
  `confirmed` from the client directly for another user's row — that
  transition is done via a Server Action calling a definer function, so the
  *state machine* (which status can follow which) lives in one place instead
  of being reconstructable from raw RLS grants.
- **recurring_bookings / recurring_booking_occurrences**: same shape as
  appointments — customer sees their own; assigned hairdresser sees theirs to
  approve/reject; admin sees all in-org.
- **notifications**: a user only ever sees rows where
  `recipient_profile_id = auth.uid()`.
- **audit_logs**: no client access at all (`admin`/`owner` read-only via a
  dedicated view, if ever exposed) — written only by server-side service-role
  calls.

`profiles` has its own simple policy: a user can read/update their own row;
an org member can read the *minimal* public fields (name, avatar) of another
profile only where a shared `organization_members` row exists — implemented
as a `security definer` view rather than a broad RLS `select`, so a
customer can never enumerate arbitrary profiles.

Every table's RLS is exercised by the test suite in section 82 of the spec —
specifically edge cases 12/13 ("customer hits hairdresser route",
"hairdresser reaches into another org") must be **database-level** test
failures, not just UI-hidden.

---

## E. Booking Engine — Zero Double-Booking

Frontend responsibility: show availability, optimistically disable a slot the
instant it's tapped, and treat any server rejection as "someone beat you to
it" rather than a generic error (spec section 50).

Backend/database is the actual authority, via two layers:

1. **Availability computation** (read path, not authoritative, just what's
   *offered*): a server-side function unions the hairdresser's
   `availability_rules` for that weekday, subtracts `availability_exceptions`
   and `blocked_slots`, subtracts existing `appointments` with status in
   `(pending, confirmed)`, and slices the remainder into
   `booking_interval_minutes` grid steps (org setting, default 30) — but only
   as candidate slots. This computation is never trusted for the write.

2. **Write path — the actual guarantee** is the PostgreSQL `EXCLUDE`
   constraint from section C:
   ```sql
   exclude using gist (hairdresser_id with =, during with &&)
     where (status in ('pending','confirmed'))
   ```
   Two concurrent inserts for overlapping `during` ranges on the same
   hairdresser: the database allows exactly one to commit and raises a
   `23P01` (exclusion violation) for the other, atomically, with no
   application-level locking needed. The Server Action catches that specific
   Postgres error code and turns it into the user-facing "this slot was just
   taken" response — it does not do a pre-check-then-insert (a classic TOCTOU
   race); it inserts and lets the database decide, per the exclusion
   constraint, which is the entire point of enforcing it there and not in
   JS.

   This also naturally covers variable service durations (edge case 17): the
   exclusion is on the actual `tstzrange`, not on a slot index, so a 90-minute
   tattoo booking correctly blocks three 30-minute grid slots without any
   special-casing.

3. Cancelling/rejecting an appointment simply updates `status`, which drops
   it out of the `where` clause of the exclusion constraint, freeing the
   range for new bookings — no separate "release slot" step to forget.

---

## F. Recurring Booking Engine

**Rule vs. occurrence**, exactly as spec section 28 mandates:

- `recurring_bookings` is the *pattern* ("every Friday at 17:30 with Angelo,
  from Sept 25 to Dec 18").
- `recurring_booking_occurrences` is *one materialized date* of that pattern,
  each with its own lifecycle independent of the rule.

**Approval workflow** (spec section 29/30):
```
customer submits → recurring_bookings.status = 'pending_approval'
                     (no occurrences generated yet — nothing to approve into)
hairdresser opens Requests → sees the rule in plain language
  [Accept] → status='active'; a generation job immediately materializes
             occurrences from starts_on up to a rolling horizon (e.g. +12
             weeks), each occurrence.status='scheduled', and an
             appointments row is created per occurrence with
             status='confirmed' (subject to the same EXCLUDE constraint —
             if a conflict exists at generation time, that single
             occurrence gets status='conflict' instead of failing the whole
             batch)
  [Reject]  → status='rejected'; customer notified; no occurrences ever
             generated
```
A background job (Supabase scheduled function / cron) extends the generated
window forward periodically for active rules with no `ends_on`, and stops
generating past `ends_on`/`occurrence_count`.

**Per-occurrence exceptions** (spec section 31, edge cases 3–5): if a
hairdresser adds an `availability_exceptions` row (vacation) that covers a
future occurrence's date, a checked job (or a trigger-driven check at
generation time) flips that single occurrence to `status='conflict'` with a
`conflict_reason`, **without touching the rule or any other occurrence**. The
customer/hairdresser sees a "needs attention" badge on that one date and can
resolve it (cancel that date, or the hairdresser proposes an alternative —
alternative-proposal UI is a fast-follow, not MVP-blocking).

**Cancellation** (spec section 32):
- "Cancel just this appointment" → sets that one `occurrence.status =
  'cancelled'` and its linked `appointment.status = 'cancelled'`; the rule
  and all other occurrences are untouched.
- "Cancel all future appointments" → sets `recurring_bookings.status =
  'cancelled'`, cancels every occurrence with `occurrence_date >= today` that
  isn't already completed, and stops future generation. Past occurrences are
  left as history.

**Modification** (spec section 33, architecturally reserved, not built in
MVP): changing day/time/frequency/end-date on a rule is modeled as "close out
the current rule as of a cutover date, create a new rule from that date
forward" rather than mutating an active rule in place — this keeps history
honest (what actually happened on Oct 3rd doesn't retroactively change) and
is a natural extension of the rule/occurrence split already in place.

---

## G. User Flows

### Customer
```
Login (Google / email / magic link)
 → Home ("Welcome back, Marco" + next appointment card + [Prenota] CTA)
   → Prenota → choose hairdresser → choose service (if >1 active) →
     choose date (horizontal carousel) → choose time (slot grid) →
     review → confirm → success screen
   → Prenotazione ricorrente → hairdresser → service → weekday →
     frequency → time → start/end → review → "Invia richiesta"
     (explicit copy: "needs Angelo's approval")
   → Appuntamenti (list: upcoming / past, cancel action with the
     single-occurrence-vs-all-future prompt where relevant)
   → Profilo (name, phone, notification prefs, logout)
```

### Hairdresser
```
Login
 → Agenda (today's appointments, chronological, "AVAILABLE" gaps shown)
 → Richieste (pending recurring requests — plain-language card,
   Accept/Reject)
 → Disponibilità (weekly rule editor + exceptions + manual blocks)
 → Profilo
```

### Admin / Owner
```
Login
 → Dashboard (today across all hairdressers, pending requests count)
 → Calendario (full calendar, filterable by hairdresser)
 → Staff (manage hairdressers, services, hairdresser_services)
 → Impostazioni (branding, hours, booking_interval, cancellation policy,
   notification preferences)
```

---

## H. Routing (Next.js App Router)

```
app/
├── (public)/
│   ├── page.tsx                     # landing page — logo, brand, CTA
│   └── o/[slug]/page.tsx            # future public org landing (SEO, spec §88/89)
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── reset-password/page.tsx
├── app/                             # customer area (authenticated)
│   ├── layout.tsx                   # bottom nav: Home / Prenota / Appuntamenti / Profilo
│   ├── page.tsx                     # home
│   ├── book/
│   │   ├── page.tsx                 # choose hairdresser
│   │   ├── [hairdresserId]/page.tsx # choose service + date + time
│   │   └── recurring/page.tsx
│   ├── appointments/page.tsx
│   └── profile/page.tsx
├── hairdresser/
│   ├── layout.tsx                   # bottom nav: Agenda / Richieste / Disponibilità / Profilo
│   ├── page.tsx                     # agenda
│   ├── requests/page.tsx
│   ├── availability/page.tsx
│   └── profile/page.tsx
├── admin/
│   ├── layout.tsx                   # sidebar on desktop, tab bar on mobile
│   ├── page.tsx                     # dashboard
│   ├── calendar/page.tsx
│   ├── staff/page.tsx
│   └── settings/page.tsx
└── api/
    └── ...                          # webhooks only (e.g. future Stripe); all
                                      # first-party mutations go through
                                      # Server Actions, not API routes
```

Tenant resolution for the MVP: the authenticated user's single active
membership determines the organization (a user with memberships in more than
one org gets an org switcher — reserved, not needed until a second tenant
exists). No route segment encodes the organization by name; `[slug]` is the
only place a tenant identifier appears in a URL, and only in the public
pre-auth surface.

Role-based access is enforced in `middleware.ts` (redirect if the session's
role for the current org doesn't match the route's audience) **and** re-
checked in every Server Action — the middleware is a UX convenience, not the
security boundary (spec section 53).

---

## I. Component Architecture

```
src/
├── app/                    # routing only — thin pages, no business logic
├── components/
│   ├── ui/                 # shadcn-based primitives, fully re-themed
│   ├── booking/            # HairdresserPicker, ServicePicker, BookingSummary
│   ├── calendar/           # DateCarousel, TimeSlotGrid, AgendaList, WeekGrid (desktop)
│   ├── appointments/       # AppointmentCard, CancelSheet
│   ├── hairdressers/       # HairdresserCard, AvailabilityEditor
│   ├── recurring/          # RecurrenceBuilder, RequestCard
│   ├── notifications/      # NotificationBell, NotificationList
│   └── layout/             # BottomNav, Sidebar, TopBar
├── lib/
│   ├── supabase/           # server client, browser client, middleware client
│   ├── auth/               # session helpers, role resolution
│   ├── bookings/           # createAppointment, cancelAppointment — the
│   │                       # domain service layer Server Actions call into
│   ├── recurring/          # createRecurringBooking, approve, reject,
│   │                       # generateOccurrences, cancelOccurrence
│   ├── availability/       # computeAvailableSlots (read-path, section E.1)
│   ├── notifications/      # dispatch(event) → channel adapters
│   └── permissions/        # requireRole(), requireOrgMember() — server-side
│                           # guards used by every Server Action
├── hooks/                  # useAvailability, useAppointments, ...
├── types/                  # generated Supabase types + domain enums
├── config/                 # design tokens, nav config per role
└── styles/
```

Rule enforced throughout: a React component never talks to Supabase
directly for a mutation. It calls a Server Action, which calls a `lib/`
domain service, which calls `lib/permissions` before touching the database.
Reads for rendering can use the RLS-protected client directly from Server
Components where that's simpler than a dedicated service.

---

## J. Design System

**Palette** (spec sections 5–6, derived from the logo's black/white
ink-on-skin contrast):
- `--ink-950` near-black background (`#0B0B0C`)
- `--ink-900` / `--ink-800` surface layers
- `--paper-50` off-white (`#F5F3EF`) — not pure white, to read as "paper/skin"
  rather than clinical SaaS white
- `--paper-200` for secondary surfaces in light contexts
- one accent, used sparingly (badges, focus rings, the primary CTA only):
  a deep ink-red (`#8C1F28`) — traditional tattoo-flash red, not a bright
  "brand blue." No secondary accent in the MVP.

**Typography**:
- UI font: a modern grotesk/sans (Inter or similar variable font) for every
  functional surface — forms, buttons, dates, times, menus, calendar, error
  states. Non-negotiable per spec section 6.
- Display font: a blackletter/gothic face used **only** for the app's own
  wordmark recreation is explicitly avoided — see logo policy below. Where a
  decorative headline is needed outside the logo itself (e.g. a section
  title on the public landing page), a restrained blackletter accent is
  permitted at large sizes only, never below ~24px and never for anything
  interactive.

**Logo policy** (spec section 7, judgment call from the plan): `Logo.png`
(rasterized) and `Logo.pdf` (vector) are the source of truth and are used as
locked image assets — full lockup for header/hero/splash, never redrawn in
CSS or approximated with a webfont. The supplied artwork is a wordmark only,
with no standalone icon/symbol at small sizes. Before Phase 15 (PWA), a
simplified mark must be produced (e.g. isolating the ornamental star/flourish
from the wordmark, or a clean "AB" monogram in the same linework style) for
favicon/app-icon use — the full wordmark is illegible below ~120px and should
not be force-fit into a 32px favicon.

**Spacing / radius / shadows**: 4px base spacing scale; radius tokens `sm
(6px) / md (10px) / lg (16px)` — soft enough to feel modern, not so soft it
reads as generic-SaaS-rounded; shadows kept minimal (barber culture reads as
flat/high-contrast, not soft-glow skeuomorphic).

**Components**: buttons use large touch targets (min 44px height) with the
accent red reserved for the single primary action per screen; cards use flat
dark surfaces with a hairline border rather than heavy shadows; the calendar
and time-slot grid are deliberately the plainest-looking screens in the app
(spec section 4 — "the calendar must NOT be elaborate").

All tokens are defined once in `config/theme.ts` and consumed by Tailwind
config, structured so that an `organizations.primary_color` /
`secondary_color` / `accent_color` can override the accent token at runtime
per tenant in the future, without the component layer knowing tenants exist.

---

## K. Mobile UX (explicit, per screen)

- **Booking flow**: single-column, one decision per screen where possible;
  hairdresser and service pickers are large tap cards, not dropdowns; date
  picker is a horizontally-scrollable day carousel (never a desktop-style
  month grid on mobile); time slots are a wrapping grid of big buttons,
  taken slots visibly disabled; a sticky bottom summary/CTA bar keeps
  "Confirm" reachable with a thumb through the whole flow.
- **Calendar (hairdresser agenda)**: vertical agenda list for "today," not a
  grid — matches how a barber actually thinks about their day.
- **Recurring builder**: a wizard, one question per screen ("With whom?" →
  "Which day?" → "How often?" → "What time?" → "From/To?" → review), each
  with large single-choice tap targets, mirroring spec section 79's exact
  script.
- **Requests (hairdresser)**: plain-language card with two large actions
  (Accept/Reject) side by side, no ambiguity about what's being approved.
- **Forms**: short, correct input types (`email`, `tel`, `date`, `time`),
  autofill-friendly, no unnecessary fields.
- **Safe areas**: bottom nav and sticky CTAs respect
  `env(safe-area-inset-bottom)`; modals/bottom sheets are used instead of
  dialogs that fight the virtual keyboard.
- **Breakpoints**: designed and manually checked at 320/360/375/390/414,
  then tablet, then desktop — never designed desktop-first and shrunk.

Desktop is treated as an enhancement layer (sidebar nav, calendar grid, wider
multi-column layouts for admin) built from the same components and tokens,
never a parallel design.

---

## L. PWA Strategy

- `manifest.json`: name/short_name, theme_color/background_color from org
  branding tokens, `display: standalone`, icons at 192/512 (+ maskable) sized
  from the simplified mark described in section J, not the full wordmark.
- Service worker via a Next.js-compatible PWA plugin: precache the app shell
  and static assets; runtime cache for read-mostly data (org branding,
  service list) with a short TTL; **never** cache booking-mutation responses,
  and never allow a stale "available" slot list to be served from cache as
  if fresh (network-first for anything availability-related).
- Offline fallback: a minimal "You're offline — reconnect to book" screen for
  the booking flow specifically (booking must not be attempted offline, to
  avoid the double-booking/optimistic-UI trap in spec section 60); already-
  loaded appointment data can render from cache read-only.
- Install UX: a dismissible, non-modal "Install the app" card on the
  customer home after a successful first booking (not on first load), plus a
  contextual instructions sheet for iOS Safari where automatic install
  prompts aren't available (spec section 47).

---

## M. Security

- **Authentication**: Supabase Auth — Google OAuth as the primary path,
  email/password with reset flow, and magic link as a low-friction
  alternative. Session cookies handled via Supabase's SSR helpers; no tokens
  stored in `localStorage`.
- **Authorization**: three enforcement layers, all required, none trusted
  alone — (1) middleware redirect for UX, (2) `lib/permissions` checks inside
  every Server Action re-deriving role from `organization_members` server-
  side (never from a client-supplied claim), (3) RLS as the database-level
  backstop so even a bug in (1)/(2) can't leak or corrupt another tenant's
  data.
- **RLS**: detailed in section D; exercised by the test matrix in spec
  section 82/edge-cases 12–13.
- **Input validation**: Zod schemas at every Server Action boundary,
  covering date/time/professional/service/recurrence/permission shape before
  it reaches a domain service.
- **Secrets**: `.env.local` only, `.env.example` committed with variable
  names and no values, service-role key never shipped to the client bundle.
- **Rate limiting**: booking-mutation endpoints get basic rate limiting
  (e.g. Upstash or Supabase Edge Function throttling) to blunt scripted
  double-submit abuse, independent of the DB-level correctness guarantee.
- **Audit log**: every state-changing action (appointment created/cancelled,
  recurring approved/rejected, availability changed) writes to `audit_logs`
  server-side, not client-reported.

---

## N. Roadmap (spec section 96, restated with a definition of done)

| Phase | Scope | Done when |
|---|---|---|
| 1 | Project setup | Next.js + TS + Tailwind scaffolded, repo initialized, lint/format configured |
| 2 | Supabase | Project linked, CLI migrations workflow working locally |
| 3 | Database schema | All tables in section C exist as versioned migrations, seedable |
| 4 | RLS | Policies from section D applied; a scripted test proves cross-tenant/cross-role access is denied |
| 5 | Authentication | Google + email + magic link all working end-to-end against Supabase Auth |
| 6 | Organization / tenant | Seed creates American Barber Tattoo org; no code path assumes a single org |
| 7 | Hairdressers | CRUD from admin; seeded with Angelo, Cimbone, Vito, Fede as data, not constants |
| 8 | Availability | Rules + exceptions + blocked slots editable and correctly computed into candidate slots |
| 9 | Booking engine | EXCLUDE constraint in place; concurrent-insert test proves exactly one booking wins |
| 10 | Recurring engine | Request → approve/reject → occurrence generation → per-occurrence conflict handling all working |
| 11 | Customer UX | Full mobile booking + recurring flows per section K, matching the section 78/79 scripts |
| 12 | Hairdresser UX | Agenda, requests, availability editor, mobile-first |
| 13 | Admin | Staff/services/settings management, works on mobile, better on desktop |
| 14 | Notifications | Event log + email channel wired for the event list in section C |
| 15 | PWA | Installable on Android Chrome and iOS Safari, offline fallback for booking |
| 16 | Design polish | Micro-interactions, empty/loading/error states audited against spec section 95 |
| 17 | Testing | Coverage for the list in spec section 82 plus the edge cases in section 81 |
| 18 | Performance | Lighthouse mobile pass, bundle audited, images optimized |
| 19 | Final QA | Full manual pass of section 81's 17 edge cases on a real device |

Each phase is verified (works, no regressions) before the next begins, per
spec section 97 — no phase is claimed done on "the happy path renders."
