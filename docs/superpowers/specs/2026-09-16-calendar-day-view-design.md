# Calendar day-view redesign (Apple Calendar-style collapse)

## Context

Today there is no real clickable calendar anywhere in the app — despite the
product being a hairdresser booking system. Three separate surfaces each
reinvent a flat, server-rendered "day view" with no shared component and no
motion:

- **Admin** (`src/app/admin/calendar/page.tsx`) — a native `<input
  type="date">` form (GET submit) reloads the page; appointments render as a
  plain `<ul>`. A code comment already flags this as a stand-in for "a real
  calendar grid (section 43)".
- **Hairdresser** (`src/app/hairdresser/page.tsx`) — an agenda fixed to
  "today" only, built by `buildAgenda()` in `src/lib/hairdressers/agenda.ts`.
  No day navigation exists at all.
- **Customer booking** (`src/app/app/book/[hairdresserId]/page.tsx`) — a
  14-day horizontal carousel (`src/components/booking/date-carousel.tsx`,
  server-rendered links) above a slot grid
  (`src/components/booking/time-slot-grid.tsx`).

None of the three use a calendar library or an animation library — the whole
app styles with Tailwind only, and `package.json` has no `framer-motion` or
equivalent. The request is to make day selection feel like Teams/Apple
Calendar: fluid, minimal-but-present motion, not the current flat
reload-on-click feel.

A privacy constraint already holds and must not regress: when a customer
looks at a day's slots, occupied slots must show as blocked without
revealing which customer holds them. This is already enforced today —
`fetchIntervals` in `src/lib/availability/compute.ts` selects only the
`during` column from `appointments`, and RLS
(`supabase/migrations/20260911080644_rls_policies.sql`) restricts row
visibility to `customer_profile_id = auth.uid()`, the assigned hairdresser,
or an admin. This design does not touch queries or RLS, so the guarantee is
preserved by construction.

## Goals

- One consistent, native-feeling day-selection interaction across all three
  surfaces (admin, hairdresser, customer booking).
- Motion that is minimal but present: a short collapse/expand and a
  fade/slide on content swap — not zero animation (the current flatness is
  part of what reads as "clunky"), and not heavy/gratuitous motion either.
- No new dependencies (no calendar library, no animation library).
- No change to data-fetching/privacy behavior — this is a presentation-layer
  change only.
- Hairdresser gains day navigation (today it's locked to "today").

## Non-goals

- Week/agenda/multi-day views, drag-to-reschedule, or any interaction beyond
  "select a day, see that day's content below".
- Changing the underlying availability/appointment computation logic
  (`compute.ts`, `agenda.ts`) — only how its output is presented and how the
  selected date is chosen.
- A unified single component identical across all three surfaces (see
  "Two variants" below — deliberately rejected).

## Approach: Apple Calendar-style collapse, shared base + two variants

Two design options were considered:

1. **Collapse-to-strip (chosen)** — the calendar (full month for
   admin/hairdresser, or a day strip for the customer) stays inline above the
   content, never an overlay. Clicking a day animates the month grid down to
   just its selected week, and the day's content (appointment list or slot
   grid) fades/slides in below. This is the interaction the user explicitly
   named (Apple Calendar), needs no focus-trap/backdrop machinery, and reads
   as light motion rather than a modal appearing.
2. **Bottom sheet/drawer** — rejected. Requires open/close state, backdrop,
   focus trap; more moving parts for a "keep it minimal" goal.

A single identical component across all three surfaces was also considered
and rejected: the customer booking flow deliberately limits itself to the
near-term days a customer would plausibly book (today's 14-day carousel),
and showing a full month (mostly past or irrelevant days) there would hurt
the booking flow's speed. Admin and hairdresser genuinely need free
navigation across a full month. So the design shares the visual language and
the "content panel below" transition, but the calendar chrome itself has two
variants.

## Components

- **`src/components/calendar/day-pill.tsx`** (new, presentational) — a
  single day cell: day number, weekday initial, a dot if the day has
  appointments, and `today`/`selected` visual states. Pure component, no
  data fetching. Shared by the month grid and the customer's day strip.
- **`src/components/calendar/month-calendar.tsx`** (new, Client Component) —
  full month grid for admin/hairdresser. Owns the expanded/collapsed visual
  state: on day click, animates the grid's height down to just the selected
  week (CSS `grid-template-rows`/`max-height` transition, ~180ms,
  standard easing). Exposes the selected date via the existing
  `?date=` URL convention (see Data flow).
- **`src/components/calendar/day-panel.tsx`** (new, Client Component,
  thin wrapper) — wraps whatever renders "below" the calendar (appointment
  list, agenda, or slot grid). Keyed by the selected date; on date change it
  fades/slides its content (~150ms). Used by all three surfaces so the
  "day changed" motion feels the same everywhere.
- **`src/components/booking/date-carousel.tsx`** (modified) — restyled to
  use `day-pill.tsx` for each day instead of its current markup, so the
  customer strip and the admin/hairdresser month grid look like the same
  design system. Its navigation moves from plain `<Link>`s to the same
  client-side transition pattern described below.
- **`src/components/booking/time-slot-grid.tsx`** (modified) — wrapped in
  `day-panel.tsx` so slot changes get the same fade/slide as appointment
  lists elsewhere. Its internal privacy behavior (no customer identity
  surfaced for occupied slots) is untouched.

## Data flow

The app stays server-driven — Server Components reading `searchParams.date`
and querying Supabase server-side, exactly as today. This design does not
introduce client-side Supabase calls or a new API route. What changes is how
the transition to a new `date` feels:

1. On day click, `month-calendar` / `day-pill` updates its own visual
   state (collapsed week, selected pill) immediately, client-side, before
   any network activity.
2. The URL is updated via `router.push` wrapped in React's `useTransition`,
   so the previously-rendered content (list/grid) stays visible — no blank
   flash — while the Server Component refetches for the new date.
3. When the new server-rendered content arrives, `day-panel` fades/slides it
   in in place of the old content.

`src/app/hairdresser/page.tsx` gains `searchParams.date` support (it
currently hardcodes "today") and adopts `month-calendar` + `day-panel`,
reusing the same pattern as admin rather than inventing a second one.

## Error handling

Unchanged. Each page keeps whatever error handling it already has for failed
Supabase reads; this design only changes the presentation wrapper around
existing content, not the fetch/error paths.

## Testing

- `month-calendar`: unit tests for the pure grid-generation logic (which
  days belong to the displayed month, which is "today", which is
  "selected", which week to show once collapsed). No test asserts on the
  CSS transition itself.
- Accessibility: selected day exposes `aria-current`; days are keyboard
  navigable; an `aria-live` region announces the newly selected date so the
  change is perceivable without relying on the visual animation.
- No changes needed to existing privacy/RLS tests — behavior there is
  untouched by this design.

## Scope

6 files, all new or modified as listed above under Components. No new
dependencies.
