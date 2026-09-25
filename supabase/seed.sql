-- Seed data (spec section 67). Fixed UUIDs make this idempotent (safe to
-- re-run) rather than a source of duplicate rows on every `db reset`/push.
--
-- Demo customer/hairdresser/admin *accounts* are intentionally NOT seeded
-- here: profiles.id is a foreign key into auth.users, which only gets a row
-- once someone actually signs up through Supabase Auth (Phase 5). Seeding
-- fake auth users with real passwords here would also violate "NON mettere
-- password reali nel repository" (section 67).

insert into public.organizations (id, name, slug, timezone, locale)
values (
  '00000000-0000-0000-0000-000000000001',
  'American Barber Tattoo',
  'american-barber-tattoo',
  'Europe/Rome',
  'it-IT'
)
on conflict (id) do nothing;

insert into public.locations (id, organization_id, name, active)
values (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000001',
  'American Barber Tattoo - Main',
  true
)
on conflict (id) do nothing;

insert into public.hairdressers (id, organization_id, display_name, avatar_url, active, sort_order)
values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'Angelo', '/team/angelo.png', true, 1),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', 'Cimbone', '/team/cimbone.png', true, 2),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000001', 'Vito', '/team/vito.png', true, 3),
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000001', 'Fede', '/team/fede.png', true, 4),
  ('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000001', 'Luigi', '/team/luigi.png', true, 5)
on conflict (id) do update set avatar_url = excluded.avatar_url;

insert into public.services (id, organization_id, name, duration_minutes, active, sort_order)
values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000001', 'Taglio', 30, true, 1),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000001', 'Barba', 30, true, 2),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000001', 'Taglio + Barba', 60, true, 3)
on conflict (id) do nothing;

insert into public.hairdresser_services (hairdresser_id, service_id)
select h.id, s.id
from public.hairdressers h
cross join public.services s
where h.organization_id = '00000000-0000-0000-0000-000000000001'
on conflict do nothing;

-- Default weekly hours matching the real Google Business listing (Mon-Fri
-- 08:00-22:00, Sat 08:00-19:00, closed Sunday) so a fresh seed is actually
-- bookable - without this every day shows "closed" until each hairdresser
-- sets their own hours from /hairdresser/availability, which needs a real
-- linked auth account. No fixed ids/on-conflict here since availability_rules
-- has no natural unique key to conflict on; the not-exists guard keeps
-- re-running this file from duplicating rows.
insert into public.availability_rules (organization_id, hairdresser_id, location_id, weekday, start_time, end_time)
select h.organization_id, h.id, '00000000-0000-0000-0000-000000000101', wd.weekday, wd.start_time, wd.end_time
from public.hairdressers h
cross join (
  values (0, '08:00', '22:00'), (1, '08:00', '22:00'), (2, '08:00', '22:00'),
         (3, '08:00', '22:00'), (4, '08:00', '22:00'), (5, '08:00', '19:00')
) as wd(weekday, start_time, end_time)
where h.organization_id = '00000000-0000-0000-0000-000000000001'
  and not exists (
    select 1 from public.availability_rules ar
    where ar.hairdresser_id = h.id and ar.weekday = wd.weekday
  );
