-- organizations: the tenant root (DESIGN.md section C)
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  favicon_url text,
  primary_color text,
  secondary_color text,
  accent_color text,
  timezone text not null default 'Europe/Rome',
  locale text not null default 'it-IT',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- profiles: user identity, 1:1 with auth.users. Not org-scoped - a person is
-- one identity that can belong to many organizations (section 17).
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a Supabase Auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- organization_members: the single source of truth for "who can do what,
-- where" (section D). Never inferred from profiles alone.
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.org_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, profile_id, role)
);

create index organization_members_org_idx on public.organization_members(organization_id);
create index organization_members_profile_idx on public.organization_members(profile_id);
