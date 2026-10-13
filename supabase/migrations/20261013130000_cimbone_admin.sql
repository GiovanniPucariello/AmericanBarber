-- Cimbone (and Angelo, once his account exists - via "Amministratore" on the
-- link-account form) run the shop: admin role on top of their hairdresser
-- membership. Other barbers stay hairdresser-only (own schedule/settings).
insert into public.organization_members (organization_id, profile_id, role, active)
select h.organization_id, h.profile_id, 'admin', true
from public.hairdressers h
where h.id = '00000000-0000-0000-0000-000000000202' -- Cimbone
  and h.profile_id is not null
on conflict (organization_id, profile_id, role) do update set active = true;
