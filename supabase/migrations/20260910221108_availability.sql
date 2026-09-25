-- availability_rules: recurring weekly template per hairdresser (section 34).
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  hairdresser_id uuid not null references public.hairdressers(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null check (end_time > start_time),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index availability_rules_hairdresser_idx on public.availability_rules(hairdresser_id);

-- availability_exceptions: one-off overrides - vacation/sick day/closed day,
-- or an extra availability window (section 34).
create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  hairdresser_id uuid not null references public.hairdressers(id) on delete cascade,
  date date not null,
  type public.availability_exception_type not null,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz not null default now(),
  constraint availability_exceptions_range_times check (
    (type = 'unavailable_all_day' and start_time is null and end_time is null)
    or (type in ('unavailable_range', 'extra_range')
        and start_time is not null and end_time is not null and end_time > start_time)
  )
);

create index availability_exceptions_hairdresser_date_idx
  on public.availability_exceptions(hairdresser_id, date);

-- blocked_slots: manual ad-hoc block, distinct from a schedule change
-- (section 34). GiST index backs the same range-overlap query pattern used
-- by the booking engine's availability computation (section E.1).
create table public.blocked_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  hairdresser_id uuid not null references public.hairdressers(id) on delete cascade,
  during tstzrange not null,
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index blocked_slots_hairdresser_during_idx
  on public.blocked_slots using gist (hairdresser_id, during);
