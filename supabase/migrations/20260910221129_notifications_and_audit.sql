-- notification_events: channel-agnostic event log, one row per business
-- event, independent of how (or whether) it's delivered (section C).
create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type public.notification_event_type not null,
  appointment_id uuid references public.appointments(id) on delete set null,
  recurring_booking_id uuid references public.recurring_bookings(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index notification_events_org_idx on public.notification_events(organization_id);

-- notifications: per-recipient delivery record (fan-out from an event to N
-- recipients / M channels - only "email" is implemented in the MVP).
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  notification_event_id uuid not null references public.notification_events(id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  channel public.notification_channel not null,
  status public.notification_status not null default 'pending',
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_idx on public.notifications(recipient_profile_id);
create index notifications_event_idx on public.notifications(notification_event_id);

-- audit_logs: no client access at all - written only by server-side calls
-- (section 66/M). Not shown to end users; kept for debugging and future
-- management tooling.
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_org_idx on public.audit_logs(organization_id);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);
