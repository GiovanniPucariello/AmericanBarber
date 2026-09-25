-- RLS policies (DESIGN.md section D). Phase 3 already enabled RLS on every
-- table with zero policies (default-deny); this migration adds the actual
-- access rules on top. organization_members is the single source of truth
-- for "can this request see/touch this row" - never inferred from profiles
-- or trusted from a client-supplied claim.

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so they can read organization_members /
-- hairdressers regardless of the calling user's own RLS visibility into
-- those tables - the classic reason RLS helper functions need definer rights).
-- ---------------------------------------------------------------------------

create or replace function public.role_rank(r public.org_role)
returns int
language sql
immutable
as $$
  select case r
    when 'customer' then 1
    when 'hairdresser' then 2
    when 'manager' then 3
    when 'admin' then 4
    when 'owner' then 5
  end;
$$;

create or replace function public.is_org_member(p_organization_id uuid, p_min_role public.org_role default null)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.profile_id = auth.uid()
      and m.active
      and (p_min_role is null or public.role_rank(m.role) >= public.role_rank(p_min_role))
  );
$$;

create or replace function public.is_own_hairdresser(p_hairdresser_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.hairdressers h
    where h.id = p_hairdresser_id
      and h.profile_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- profiles: own row only at the table level. Reading a co-member's minimal
-- public fields (name, avatar) goes through the view below instead of a
-- broad SELECT policy, so a customer can never enumerate arbitrary profiles.
-- ---------------------------------------------------------------------------

create policy "profiles: read own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create view public.co_member_profiles as
select p.id, p.full_name, p.avatar_url
from public.profiles p
where exists (
  select 1
  from public.organization_members mine
  join public.organization_members theirs on theirs.organization_id = mine.organization_id
  where mine.profile_id = auth.uid()
    and mine.active
    and theirs.profile_id = p.id
    and theirs.active
);

grant select on public.co_member_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- organizations: members read; admin/owner update. No client insert/delete -
-- org creation is service-role-only for now (no self-serve onboarding yet).
-- ---------------------------------------------------------------------------

create policy "organizations: members read" on public.organizations
  for select using (public.is_org_member(id));

create policy "organizations: admin updates" on public.organizations
  for update using (public.is_org_member(id, 'admin'))
  with check (public.is_org_member(id, 'admin'));

-- ---------------------------------------------------------------------------
-- organization_members: see your own membership, or any if you're admin/owner.
-- Only admin/owner assign roles. Self-enrollment as a customer (the signup
-- flow) goes through a SECURITY DEFINER RPC added in Phase 5/6, not a direct
-- client insert - even a role-limited insert policy would let any signed-in
-- user pick which org to attach themselves to, which isn't a decision to
-- leave to raw table access.
-- ---------------------------------------------------------------------------

create policy "organization_members: read own or admin" on public.organization_members
  for select using (
    profile_id = auth.uid() or public.is_org_member(organization_id, 'admin')
  );

create policy "organization_members: admin inserts" on public.organization_members
  for insert with check (public.is_org_member(organization_id, 'admin'));

create policy "organization_members: admin updates" on public.organization_members
  for update using (public.is_org_member(organization_id, 'admin'))
  with check (public.is_org_member(organization_id, 'admin'));

create policy "organization_members: admin deletes" on public.organization_members
  for delete using (public.is_org_member(organization_id, 'admin'));

-- ---------------------------------------------------------------------------
-- locations / hairdressers / services: any org member reads (customers need
-- this to build the booking UI); only admin/owner manage the catalog.
-- ---------------------------------------------------------------------------

create policy "locations: members read" on public.locations
  for select using (public.is_org_member(organization_id));
create policy "locations: admin inserts" on public.locations
  for insert with check (public.is_org_member(organization_id, 'admin'));
create policy "locations: admin updates" on public.locations
  for update using (public.is_org_member(organization_id, 'admin'))
  with check (public.is_org_member(organization_id, 'admin'));
create policy "locations: admin deletes" on public.locations
  for delete using (public.is_org_member(organization_id, 'admin'));

create policy "hairdressers: members read" on public.hairdressers
  for select using (public.is_org_member(organization_id));
create policy "hairdressers: admin inserts" on public.hairdressers
  for insert with check (public.is_org_member(organization_id, 'admin'));
create policy "hairdressers: admin updates" on public.hairdressers
  for update using (public.is_org_member(organization_id, 'admin'))
  with check (public.is_org_member(organization_id, 'admin'));
create policy "hairdressers: admin deletes" on public.hairdressers
  for delete using (public.is_org_member(organization_id, 'admin'));

create policy "services: members read" on public.services
  for select using (public.is_org_member(organization_id));
create policy "services: admin inserts" on public.services
  for insert with check (public.is_org_member(organization_id, 'admin'));
create policy "services: admin updates" on public.services
  for update using (public.is_org_member(organization_id, 'admin'))
  with check (public.is_org_member(organization_id, 'admin'));
create policy "services: admin deletes" on public.services
  for delete using (public.is_org_member(organization_id, 'admin'));

create policy "hairdresser_services: members read" on public.hairdresser_services
  for select using (
    exists (
      select 1 from public.hairdressers h
      where h.id = hairdresser_services.hairdresser_id
        and public.is_org_member(h.organization_id)
    )
  );
create policy "hairdresser_services: admin inserts" on public.hairdresser_services
  for insert with check (
    exists (
      select 1 from public.hairdressers h
      where h.id = hairdresser_services.hairdresser_id
        and public.is_org_member(h.organization_id, 'admin')
    )
  );
create policy "hairdresser_services: admin deletes" on public.hairdresser_services
  for delete using (
    exists (
      select 1 from public.hairdressers h
      where h.id = hairdresser_services.hairdresser_id
        and public.is_org_member(h.organization_id, 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- availability_rules / availability_exceptions / blocked_slots: any org
-- member reads (needed to compute candidate slots); the owning hairdresser
-- or an admin/owner manages.
-- ---------------------------------------------------------------------------

create policy "availability_rules: members read" on public.availability_rules
  for select using (public.is_org_member(organization_id));
create policy "availability_rules: owner or admin insert" on public.availability_rules
  for insert with check (
    public.is_own_hairdresser(hairdresser_id) or public.is_org_member(organization_id, 'admin')
  );
create policy "availability_rules: owner or admin update" on public.availability_rules
  for update using (
    public.is_own_hairdresser(hairdresser_id) or public.is_org_member(organization_id, 'admin')
  ) with check (
    public.is_own_hairdresser(hairdresser_id) or public.is_org_member(organization_id, 'admin')
  );
create policy "availability_rules: owner or admin delete" on public.availability_rules
  for delete using (
    public.is_own_hairdresser(hairdresser_id) or public.is_org_member(organization_id, 'admin')
  );

create policy "availability_exceptions: members read" on public.availability_exceptions
  for select using (public.is_org_member(organization_id));
create policy "availability_exceptions: owner or admin insert" on public.availability_exceptions
  for insert with check (
    public.is_own_hairdresser(hairdresser_id) or public.is_org_member(organization_id, 'admin')
  );
create policy "availability_exceptions: owner or admin update" on public.availability_exceptions
  for update using (
    public.is_own_hairdresser(hairdresser_id) or public.is_org_member(organization_id, 'admin')
  ) with check (
    public.is_own_hairdresser(hairdresser_id) or public.is_org_member(organization_id, 'admin')
  );
create policy "availability_exceptions: owner or admin delete" on public.availability_exceptions
  for delete using (
    public.is_own_hairdresser(hairdresser_id) or public.is_org_member(organization_id, 'admin')
  );

create policy "blocked_slots: members read" on public.blocked_slots
  for select using (public.is_org_member(organization_id));
create policy "blocked_slots: owner or admin insert" on public.blocked_slots
  for insert with check (
    (public.is_own_hairdresser(hairdresser_id) or public.is_org_member(organization_id, 'admin'))
    and created_by = auth.uid()
  );
create policy "blocked_slots: owner or admin delete" on public.blocked_slots
  for delete using (
    public.is_own_hairdresser(hairdresser_id) or public.is_org_member(organization_id, 'admin')
  );

-- ---------------------------------------------------------------------------
-- appointments: row visibility is customer / assigned hairdresser / admin.
-- Column-level grants are the second gate - clients may only ever touch
-- status/cancellation/notes; time, hairdresser, customer and service are
-- server-controlled (set once at creation via a Server Action, never edited
-- directly by a client row update). WITH CHECK further restricts which
-- status values each role may write, so a customer can cancel but can never
-- write 'confirmed' themselves even though the row policy lets them reach
-- their own row.
-- ---------------------------------------------------------------------------

revoke update on public.appointments from authenticated;
grant update (status, cancelled_at, cancelled_by, notes) on public.appointments to authenticated;

create policy "appointments: read own, assigned, or admin" on public.appointments
  for select using (
    customer_profile_id = auth.uid()
    or public.is_own_hairdresser(hairdresser_id)
    or public.is_org_member(organization_id, 'admin')
  );

create policy "appointments: customer creates own pending request" on public.appointments
  for insert with check (
    customer_profile_id = auth.uid() and created_by = auth.uid() and status = 'pending'
  );

create policy "appointments: admin creates on behalf of customer" on public.appointments
  for insert with check (public.is_org_member(organization_id, 'admin'));

create policy "appointments: customer cancels own" on public.appointments
  for update using (customer_profile_id = auth.uid())
  with check (customer_profile_id = auth.uid() and status = 'cancelled');

create policy "appointments: hairdresser updates status on own" on public.appointments
  for update using (public.is_own_hairdresser(hairdresser_id))
  with check (
    public.is_own_hairdresser(hairdresser_id)
    and status in ('confirmed', 'rejected', 'completed', 'no_show', 'cancelled')
  );

create policy "appointments: admin updates any in org" on public.appointments
  for update using (public.is_org_member(organization_id, 'admin'))
  with check (public.is_org_member(organization_id, 'admin'));

-- ---------------------------------------------------------------------------
-- recurring_bookings: same shape as appointments. Column grants limit
-- clients to the approval/cancellation fields only.
-- ---------------------------------------------------------------------------

revoke update on public.recurring_bookings from authenticated;
grant update (status, decided_at, decided_by) on public.recurring_bookings to authenticated;

create policy "recurring_bookings: read own, assigned, or admin" on public.recurring_bookings
  for select using (
    customer_profile_id = auth.uid()
    or public.is_own_hairdresser(hairdresser_id)
    or public.is_org_member(organization_id, 'admin')
  );

create policy "recurring_bookings: customer creates own request" on public.recurring_bookings
  for insert with check (customer_profile_id = auth.uid() and status = 'pending_approval');

create policy "recurring_bookings: customer cancels own" on public.recurring_bookings
  for update using (customer_profile_id = auth.uid())
  with check (customer_profile_id = auth.uid() and status = 'cancelled');

create policy "recurring_bookings: hairdresser accepts or rejects own" on public.recurring_bookings
  for update using (public.is_own_hairdresser(hairdresser_id))
  with check (
    public.is_own_hairdresser(hairdresser_id) and status in ('active', 'rejected', 'cancelled')
  );

create policy "recurring_bookings: admin manages any in org" on public.recurring_bookings
  for update using (public.is_org_member(organization_id, 'admin'))
  with check (public.is_org_member(organization_id, 'admin'));

-- ---------------------------------------------------------------------------
-- recurring_booking_occurrences: no direct customer_profile_id/hairdresser_id
-- columns, so visibility joins back through the parent rule. No client
-- insert/delete - occurrences are generated server-side (Phase 10).
-- ---------------------------------------------------------------------------

revoke update on public.recurring_booking_occurrences from authenticated;
grant update (status, conflict_reason) on public.recurring_booking_occurrences to authenticated;

create policy "recurring_occurrences: read via parent rule or admin" on public.recurring_booking_occurrences
  for select using (
    exists (
      select 1 from public.recurring_bookings rb
      where rb.id = recurring_booking_occurrences.recurring_booking_id
        and (rb.customer_profile_id = auth.uid() or public.is_own_hairdresser(rb.hairdresser_id))
    )
    or public.is_org_member(organization_id, 'admin')
  );

create policy "recurring_occurrences: customer cancels own occurrence" on public.recurring_booking_occurrences
  for update using (
    exists (
      select 1 from public.recurring_bookings rb
      where rb.id = recurring_booking_occurrences.recurring_booking_id
        and rb.customer_profile_id = auth.uid()
    )
  ) with check (status = 'cancelled');

create policy "recurring_occurrences: hairdresser updates own occurrence" on public.recurring_booking_occurrences
  for update using (
    exists (
      select 1 from public.recurring_bookings rb
      where rb.id = recurring_booking_occurrences.recurring_booking_id
        and public.is_own_hairdresser(rb.hairdresser_id)
    )
  ) with check (
    status in ('scheduled', 'confirmed', 'conflict', 'cancelled', 'skipped', 'rescheduled', 'completed', 'no_show')
  );

create policy "recurring_occurrences: admin manages any in org" on public.recurring_booking_occurrences
  for update using (public.is_org_member(organization_id, 'admin'))
  with check (public.is_org_member(organization_id, 'admin'));

-- ---------------------------------------------------------------------------
-- notifications: strictly own rows, and only the read/status fields.
-- notification_events and audit_logs get no policies at all (intentional -
-- internal system tables, service-role only, per DESIGN.md section D/M).
-- ---------------------------------------------------------------------------

revoke update on public.notifications from authenticated;
grant update (status, read_at) on public.notifications to authenticated;

create policy "notifications: read own" on public.notifications
  for select using (recipient_profile_id = auth.uid());

create policy "notifications: mark own as read" on public.notifications
  for update using (recipient_profile_id = auth.uid())
  with check (recipient_profile_id = auth.uid() and status = 'read');
