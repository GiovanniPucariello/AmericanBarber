# Appointment messaging (customer ↔ hairdresser)

## Context

A customer currently has no way to reach their hairdresser through the app
about a specific booking - no "I'm running 10 minutes late", no "can we push
this back half an hour?". The only existing communication channel is the
one-way `notification_feed` (booking confirmed/cancelled, recurring request
created/approved/rejected) - none of it is a message a person wrote, and
none of it can be replied to.

Requested directly by the shop owner: a way for the customer to "avvisare"
(notify) the barber, with the barber able to reply - tied to a specific
appointment, not a general chat. Explicitly not real-time: refreshing to see
new messages is fine, matching how `notification_feed` already behaves (no
websockets/polling anywhere in this codebase today).

## Goals

- A customer and the hairdresser assigned to a given appointment can
  exchange short text messages about that appointment.
- Either side gets a notification (reusing the existing
  `notification_feed`/`emit_notification_event` mechanism) when the other
  side sends a message.
- Consistent with the rest of the app: server-rendered, no client-side data
  fetching, no new runtime dependency.

## Non-goals

- Real-time delivery. Messages appear on page load/refresh, like
  notifications do today.
- General/open-ended chat not tied to an appointment - that's a different
  feature (a contact form, or a persistent customer↔hairdresser
  relationship) and wasn't asked for.
- A dedicated "all my threads" inbox screen. Entry points are per-appointment
  (see below); the existing Notifiche feed is the cross-appointment view.
- Admin UI for reading or moderating threads. RLS still grants admin read
  access, for the same reason every other appointment-linked table does
  (consistency, future audit need), but no screen is built for it now.
- Attachments, images, editing or deleting a sent message, read receipts
  beyond a simple read/unread flag.

## Data model

New table `public.appointment_messages`:

```sql
create table public.appointment_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index appointment_messages_appointment_idx
  on public.appointment_messages(appointment_id, created_at);
```

Deliberately no `sender_role` column. Trusting a client-supplied "I'm the
customer" / "I'm the hairdresser" flag would let either party lie about who
sent a message. Instead, "who sent this" is derived at read time by
comparing `sender_profile_id` to the appointment's `customer_profile_id` and
the assigned hairdresser's `profile_id` - the same derivation pattern
`notification_feed` already uses for `customer_name`/`hairdresser_name`.

`read_at` is single-column because each message has exactly one sender and
therefore exactly one implied recipient (the other party to the
appointment): it's set once, whenever the recipient views the thread.

## Access control (RLS)

Mirrors the existing `appointments` policy shape
(`supabase/migrations/20260911080644_rls_policies.sql`,
`"appointments: read own, assigned, or admin"`) exactly, scoped through a
join back to `appointments`:

- **Select**: the customer on the appointment, the assigned hairdresser
  (`is_own_hairdresser`), or an org admin.
- **Insert**: the sender must be the customer or the assigned hairdresser
  (never admin - admin isn't a party to the conversation), `sender_profile_id
  = auth.uid()`, and the appointment's `status` must be `pending` or
  `confirmed` (no starting a new thread on a cancelled/completed
  appointment - nothing left to coordinate).
- **Update**: column-restricted to `read_at` only (same `revoke update ...
  grant update (col)` pattern the `appointments` table already uses), and
  only by the *recipient* (i.e. the party on the appointment whose profile
  id does **not** match `sender_profile_id`) - a sender can't mark their own
  message read.

Existing appointment threads remain readable (but not writable) once the
appointment is cancelled or completed, for reference.

## Notification integration

Add `message_received` to the `notification_event_type` enum. Every other
event type in `emit_notification_event()` has a fixed sender→recipient
direction (e.g. a booking confirmation always notifies the hairdresser), but
a message can come from either side of the same appointment - the function
doesn't currently have a way to express "recipient is whichever of these two
isn't the caller."

Fix: special-case `message_received` in `emit_notification_event()` to set
the recipient to whichever of `v_hairdresser_profile_id` /
`v_customer_profile_id` does **not** equal `auth.uid()`, instead of using
the flat `case p_type when ...` mapping every other type uses. No new column
on `notification_events` - `appointment_id` alone is enough for
`notification_feed` to show "new message about [service] with [name] on
[date]" and link to the thread.

Called from the new `sendAppointmentMessage` server action, right after the
insert - same call shape as `createAppointment`/`cancelAppointment` already
use.

## Server actions (`src/lib/messages/actions.ts`)

- `sendAppointmentMessage(appointmentId, formData)` - inserts the message
  (RLS enforces sender/appointment-status eligibility), then calls
  `emit_notification_event('message_received', appointmentId)`.
- `markThreadRead(appointmentId)` - updates `read_at` on unread messages not
  sent by the caller, for that appointment. Called from both thread pages'
  load path (a customer/hairdresser opening the thread implicitly reads it -
  no separate "mark as read" button, matching how opening `/app/appointments`
  doesn't require a manual step either).

## UI

One shared presentational piece, two thin route wrappers (mirrors how
`MonthCalendar`/`DayPanel` are already shared across admin/hairdresser/
customer surfaces):

- `src/components/messages/message-thread.tsx` - renders the list of
  messages (own messages right-aligned/accented, the other party's
  left-aligned, per Tailwind-only styling already used everywhere else -
  no new UI kit) plus a send form (client component, `useActionState` +
  `sendAppointmentMessage`, same shape as `confirm-booking-form.tsx`). Send
  form is hidden (thread becomes read-only) once the appointment is no
  longer `pending`/`confirmed`.

Route wrappers, both server components that resolve the viewer, verify
they're a party to the appointment (defense in depth - RLS already
enforces it), fetch the thread, call `markThreadRead`, and render
`MessageThread`:

- `src/app/app/appointments/[id]/messages/page.tsx` (customer)
- `src/app/hairdresser/appointments/[id]/messages/page.tsx` (hairdresser)

Entry points:

- Customer: a "Messaggi" link on each upcoming (`pending`/`confirmed`)
  appointment row in `/app/appointments`, with an unread-count badge when
  the customer has unread messages on that thread.
- Hairdresser: same "Messaggi" link + unread badge on each appointment row
  in the agenda list (`/hairdresser`, the `agenda.map` list) for whatever
  day is selected - the hairdresser already navigates to any day via
  `MonthCalendar`, so every appointment is reachable this way, not just
  today's.
- Either side can also reach a thread directly from its `message_received`
  notification in Notifiche (already links via `appointment_id`, same as
  every other notification type).

## Testing

- Unit: `sender_profile_id` derivation/labeling helper (customer vs
  hairdresser) - pure function, easy to test in isolation like
  `buildAgenda`/`month-grid` already are.
- Integration (mirrors the existing RLS-focused integration suite from
  Phase 17): a customer cannot insert into another customer's thread; a
  hairdresser cannot insert into a thread for an appointment that isn't
  theirs; a message cannot be inserted once the appointment is
  cancelled/completed; `emit_notification_event('message_received', ...)`
  notifies the correct recipient regardless of which side called it.
