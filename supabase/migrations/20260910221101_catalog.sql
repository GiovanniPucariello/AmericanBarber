-- locations (section 20): one today, N in the future - modeled from day one.
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  address text,
  timezone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.locations
  for each row execute function public.set_updated_at();

create index locations_org_idx on public.locations(organization_id);

-- hairdressers: professional profile, distinct from account access
-- (profile_id is nullable until they're invited to log in).
create table public.hairdressers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  avatar_url text,
  bio text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.hairdressers
  for each row execute function public.set_updated_at();

create index hairdressers_org_idx on public.hairdressers(organization_id);

-- services: duration/price are data, never hardcoded in application code
-- (section 21/93 - this is why booking/recurring engines never assume 30min).
create table public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes int not null check (duration_minutes > 0),
  price_cents int check (price_cents is null or price_cents >= 0),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

create index services_org_idx on public.services(organization_id);

-- hairdresser_services: not every hairdresser offers every service.
create table public.hairdresser_services (
  hairdresser_id uuid not null references public.hairdressers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (hairdresser_id, service_id)
);
