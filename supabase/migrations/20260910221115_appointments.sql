-- appointments: the booking engine's single source of truth (section C/E).
-- recurring_occurrence_id has no FK yet - recurring_booking_occurrences is
-- created in the next migration and itself references appointments(id),
-- so the circular FK is closed there.
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  hairdresser_id uuid not null references public.hairdressers(id) on delete cascade,
  customer_profile_id uuid not null references public.profiles(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  during tstzrange not null,
  status public.appointment_status not null default 'pending',
  recurring_occurrence_id uuid,
  created_by uuid not null references public.profiles(id) on delete restrict,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

create index appointments_org_idx on public.appointments(organization_id);
create index appointments_hairdresser_idx on public.appointments(hairdresser_id);
create index appointments_customer_idx on public.appointments(customer_profile_id);

-- The zero-double-booking guarantee (section E): the database is the sole
-- authority. Two concurrent inserts with overlapping ranges for the same
-- hairdresser can never both commit - Postgres raises 23P01 for the loser,
-- which the application layer turns into "this slot was just taken".
alter table public.appointments
  add constraint no_overlapping_appointments
  exclude using gist (
    hairdresser_id with =,
    during with &&
  )
  where (status in ('pending', 'confirmed'));
