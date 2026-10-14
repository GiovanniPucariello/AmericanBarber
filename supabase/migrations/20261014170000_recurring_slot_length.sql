-- Recurring series follow the fixed slot list: each occurrence lasts until
-- the next listed start (max 45 min), like single bookings. The service's
-- duration is only used on days without a slot list.
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
  v_slot_list jsonb;
  v_minutes int;
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
  -- Length of each occurrence: the barber's fixed slot (until the next
  -- listed start, max 45 min - same rule as compute.ts sliceIntoSlots), or
  -- the service duration on days without a slot list.
  select h.slot_times -> (v_rule.weekday::text) into v_slot_list
    from public.hairdressers h where h.id = v_rule.hairdresser_id;
  if v_slot_list is not null and jsonb_typeof(v_slot_list) = 'array' and jsonb_array_length(v_slot_list) > 0 then
    select coalesce(least(45, min(extract(epoch from (t::time - v_rule.start_time)) / 60)), 45)::int
      into v_minutes
      from jsonb_array_elements_text(v_slot_list) t
      where t::time > v_rule.start_time;
  else
    v_minutes := v_rule.service_duration;
  end if;
  v_end_time := (v_rule.start_time + (v_minutes || ' minutes')::interval)::time;

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
          + (v_minutes || ' minutes')::interval,
        '[)'
      );

      v_has_rule := exists (
        select 1 from public.availability_rules ar
        where ar.hairdresser_id = v_rule.hairdresser_id
          and ar.weekday = v_rule.weekday
          and ar.active
          and ar.start_time <= v_rule.start_time
          and ar.end_time >= v_rule.start_time
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
            organization_id, location_id, hairdresser_id, customer_profile_id, guest_name,
            service_id, during, status, recurring_occurrence_id, created_by
          )
          select v_rule.organization_id, l.id, v_rule.hairdresser_id, v_rule.customer_profile_id, v_rule.guest_name,
                 v_rule.service_id, v_during, 'confirmed', v_occurrence_id,
                 coalesce(v_rule.customer_profile_id, v_rule.decided_by)
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
