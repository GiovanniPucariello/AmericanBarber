-- The public landing page (unauthenticated) needs to show the org's name
-- and real service list, but organizations/services are both fully
-- member-gated (Phase 4). Rather than loosen either base table's policy,
-- expose only the safe subset a marketing page actually needs - same
-- purpose-built-view pattern as co_member_profiles and notification_feed.
create view public.organization_marketing_profile as
select id, name, slug, primary_color, secondary_color, accent_color, timezone
from public.organizations;

grant select on public.organization_marketing_profile to anon, authenticated;

-- Listing active services (with prices) publicly is normal for any real
-- barbershop site - this is the one place a public read genuinely belongs
-- on the base table itself, scoped strictly to active = true. This is
-- read-only and org-agnostic on purpose (unlike the Phase 17 appointments/
-- recurring_bookings fix, which closed a *write* path that let one org's
-- customer act against another org's data) - a shop's public menu/pricing
-- being visible to any visitor, signed in or not, is the intended behavior
-- of "public," not a cross-tenant leak of anything operational.
create policy "services: public read active" on public.services
  for select to anon, authenticated
  using (active = true);
