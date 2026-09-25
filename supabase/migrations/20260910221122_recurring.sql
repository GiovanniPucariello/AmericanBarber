-- recurring_bookings: the RULE (section F). ends_on and occurrence_count may
-- both be null - an open-ended rule, bounded in practice by the rolling
-- generation horizon rather than a stored end date.
create table public.recurring_bookings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_profile_id uuid not null references public.profiles(id) on delete cascade,
  hairdresser_id uuid not null references public.hairdressers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  interval_weeks int not null default 1 check (interval_weeks > 0),
  starts_on date not null,
  ends_on date,
  occurrence_count int check (occurrence_count is null or occurrence_count > 0),
  status public.recurring_booking_status not null default 'pending_approval',
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.recurring_bookings
  for each row execute function public.set_updated_at();

create index recurring_bookings_org_idx on public.recurring_bookings(organization_id);
create index recurring_bookings_hairdresser_idx on public.recurring_bookings(hairdresser_id);

-- recurring_booking_occurrences: the materialized instances (section F).
-- This split is what lets "cancel just this Friday" differ from "cancel the
-- whole rule" without special-casing.
create table public.recurring_booking_occurrences (
  id uuid primary key default gen_random_uuid(),
  recurring_booking_id uuid not null references public.recurring_bookings(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  occurrence_date date not null,
  appointment_id uuid references public.appointments(id) on delete set null,
  status public.recurring_occurrence_status not null default 'scheduled',
  conflict_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recurring_booking_id, occurrence_date)
);

create trigger set_updated_at
  before update on public.recurring_booking_occurrences
  for each row execute function public.set_updated_at();

create index recurring_occurrences_booking_idx
  on public.recurring_booking_occurrences(recurring_booking_id);

-- Close the circular reference introduced in the appointments migration.
alter table public.appointments
  add constraint appointments_recurring_occurrence_fkey
  foreign key (recurring_occurrence_id)
  references public.recurring_booking_occurrences(id)
  on delete set null;

create index appointments_recurring_occurrence_idx
  on public.appointments(recurring_occurrence_id);
