-- Recurring booking engine (DESIGN.md section F). Phase 4 deliberately left
-- recurring_booking_occurrences with no INSERT policy and appointments with
-- no "hairdresser materializes an occurrence" INSERT policy, noting these
-- were server-only, generated in Phase 10. Rather than build a sprawling
-- set of RLS policies for what is really one atomic multi-step operation
-- (create the occurrence, attempt the appointment, catch a conflict, link
-- or flag it), that operation is a single SECURITY DEFINER function -
-- consistent with how join_organization_as_customer was handled in Phase 6.

-- ---------------------------------------------------------------------------
-- Column grant fix: appointment_id was missed from the Phase 4 grant list
-- for recurring_booking_occurrences (only status/conflict_reason were
-- granted) - the generation function needs to set it once an appointment
-- materializes. The function itself is SECURITY DEFINER and bypasses this
-- entirely, but the grant is corrected for consistency with the rest of the
-- column-level-grant pattern this project uses.
-- ---------------------------------------------------------------------------
grant update (status, conflict_reason, appointment_id) on public.recurring_booking_occurrences to authenticated;

-- ---------------------------------------------------------------------------
-- generate_recurring_occurrences: the actual engine. Called once right after
-- a hairdresser accepts a request (this migration doesn't stand up the
-- periodic cron job DESIGN.md mentions for extending open-ended rules
-- forward over time - that's infra, not engine logic, and is deferred).
--
-- For each occurrence date not already generated: checks whether the
-- hairdresser's *current* weekly availability_rules still cover this exact
-- time window and no availability_exceptions block it (extra_range
-- exceptions are deliberately not consulted here - a recurring slot that
-- only exists because of a one-off "extra availability" exception is
-- flagged as a conflict needing a human look, not silently auto-resolved).
-- If covered, attempts to insert the appointment and lets the exclusion
-- constraint from Phase 3 be the final word - a caught exclusion_violation
-- (23P01) becomes a per-occurrence conflict, never a failure of the whole
-- batch (section 31).
-- ---------------------------------------------------------------------------
create or replace function public.generate_recurring_occurrences(
  p_recurring_booking_id uuid,
  p_horizon_weeks int default 12
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule record;
  v_occurrence_date date;
  v_end_date date;
  v_end_time time;
  v_during tstzrange;
  v_has_rule boolean;
  v_has_unavailable boolean;
  v_occurrence_id uuid;
  v_appointment_id uuid;
begin
  select rb.*, o.timezone as org_timezone, s.duration_minutes as service_duration
    into v_rule
    from public.recurring_bookings rb
    join public.organizations o on o.id = rb.organization_id
    join public.services s on s.id = rb.service_id
    where rb.id = p_recurring_booking_id;

  if not found then
    raise exception 'Recurring booking not found: %', p_recurring_booking_id;
  end if;

  if v_rule.status <> 'active' then
    raise exception 'Recurring booking is not active';
  end if;

  -- SECURITY DEFINER bypasses RLS, so this authorization check is the only
  -- gate: only the assigned hairdresser or an org admin/owner may generate.
  if not (
    public.is_own_hairdresser(v_rule.hairdresser_id)
    or public.is_org_member(v_rule.organization_id, 'admin')
  ) then
    raise exception 'Not authorized to generate occurrences for this recurring booking';
  end if;

  v_end_date := least(
    coalesce(v_rule.ends_on, current_date + (p_horizon_weeks * 7)),
    current_date + (p_horizon_weeks * 7)
  );
  v_end_time := (v_rule.start_time + (v_rule.service_duration || ' minutes')::interval)::time;

  -- First date on/after starts_on matching the target weekday. isodow is
  -- 1=Monday..7=Sunday; this project's weekday column is 0=Monday..6=Sunday.
  v_occurrence_date := v_rule.starts_on
    + ((v_rule.weekday - (extract(isodow from v_rule.starts_on)::int - 1) + 7) % 7);

  while v_occurrence_date <= v_end_date loop
    if not exists (
      select 1 from public.recurring_booking_occurrences
      where recurring_booking_id = p_recurring_booking_id and occurrence_date = v_occurrence_date
    ) then
      v_during := tstzrange(
        (v_occurrence_date + v_rule.start_time) at time zone v_rule.org_timezone,
        ((v_occurrence_date + v_rule.start_time) at time zone v_rule.org_timezone)
          + (v_rule.service_duration || ' minutes')::interval,
        '[)'
      );

      v_has_rule := exists (
        select 1 from public.availability_rules ar
        where ar.hairdresser_id = v_rule.hairdresser_id
          and ar.weekday = v_rule.weekday
          and ar.active
          and ar.start_time <= v_rule.start_time
          and ar.end_time >= v_end_time
      );

      v_has_unavailable := exists (
        select 1 from public.availability_exceptions ae
        where ae.hairdresser_id = v_rule.hairdresser_id
          and ae.date = v_occurrence_date
          and (
            ae.type = 'unavailable_all_day'
            or (
              ae.type = 'unavailable_range'
              and ae.start_time < v_end_time
              and ae.end_time > v_rule.start_time
            )
          )
      ) or exists (
        select 1 from public.blocked_slots bs
        where bs.hairdresser_id = v_rule.hairdresser_id and bs.during && v_during
      );

      insert into public.recurring_booking_occurrences
        (recurring_booking_id, organization_id, occurrence_date, status)
      values (p_recurring_booking_id, v_rule.organization_id, v_occurrence_date, 'scheduled')
      returning id into v_occurrence_id;

      if v_has_rule and not v_has_unavailable then
        begin
          insert into public.appointments (
            organization_id, location_id, hairdresser_id, customer_profile_id,
            service_id, during, status, recurring_occurrence_id, created_by
          )
          select v_rule.organization_id, l.id, v_rule.hairdresser_id, v_rule.customer_profile_id,
                 v_rule.service_id, v_during, 'confirmed', v_occurrence_id, v_rule.customer_profile_id
          from public.locations l
          where l.organization_id = v_rule.organization_id
          order by l.created_at
          limit 1
          returning id into v_appointment_id;

          update public.recurring_booking_occurrences
          set appointment_id = v_appointment_id, status = 'confirmed'
          where id = v_occurrence_id;
        exception when exclusion_violation then
          update public.recurring_booking_occurrences
          set status = 'conflict', conflict_reason = 'This time slot is already booked.'
          where id = v_occurrence_id;
        end;
      else
        update public.recurring_booking_occurrences
        set status = 'conflict', conflict_reason = 'Hairdresser is unavailable that day.'
        where id = v_occurrence_id;
      end if;
    end if;

    v_occurrence_date := v_occurrence_date + (v_rule.interval_weeks * 7);
  end loop;
end;
$$;

grant execute on function public.generate_recurring_occurrences(uuid, int) to authenticated;
