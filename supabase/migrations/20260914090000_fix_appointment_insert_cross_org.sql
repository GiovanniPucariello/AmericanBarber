-- Security fix found by Phase 17's cross-organization RLS test (spec
-- section 81 edge case #13). The booking_direct_confirm policy checked
-- customer_profile_id/created_by/status but never checked that the caller
-- actually belongs to the organization they claimed, or that the
-- hairdresser_id they're booking against is even IN that organization.
-- A signed-in customer of org A could insert an appointment with
-- organization_id/hairdresser_id belonging to a completely different org B
-- - the exclusion constraint would still prevent a double-booking, but
-- nothing stopped the cross-tenant write itself, which is the actual
-- violation multi-tenancy exists to prevent (DESIGN.md section D).
drop policy "appointments: customer books own confirmed slot" on public.appointments;

create policy "appointments: customer books own confirmed slot" on public.appointments
  for insert with check (
    customer_profile_id = auth.uid()
    and created_by = auth.uid()
    and status = 'confirmed'
    and public.is_org_member(organization_id)
    and exists (
      select 1 from public.hairdressers h
      where h.id = hairdresser_id and h.organization_id = appointments.organization_id
    )
  );

-- Same root cause, lower severity (this one already required being an
-- admin of *some* organization), but the hairdresser-belongs-to-this-org
-- check was still missing - closing it for consistency/defense in depth.
drop policy "appointments: admin creates on behalf of customer" on public.appointments;

create policy "appointments: admin creates on behalf of customer" on public.appointments
  for insert with check (
    public.is_org_member(organization_id, 'admin')
    and exists (
      select 1 from public.hairdressers h
      where h.id = hairdresser_id and h.organization_id = appointments.organization_id
    )
  );

-- recurring_bookings had the identical gap: a customer could request a
-- recurring booking against another organization's hairdresser entirely.
drop policy "recurring_bookings: customer creates own request" on public.recurring_bookings;

create policy "recurring_bookings: customer creates own request" on public.recurring_bookings
  for insert with check (
    customer_profile_id = auth.uid()
    and status = 'pending_approval'
    and public.is_org_member(organization_id)
    and exists (
      select 1 from public.hairdressers h
      where h.id = hairdresser_id and h.organization_id = recurring_bookings.organization_id
    )
  );
