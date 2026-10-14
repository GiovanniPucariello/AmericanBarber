-- Barber-made bookings (single or recurring) for registered customers or
-- walk-ins without an account. A walk-in has no profile, just a free-text
-- guest_name so the barber remembers who it is.

-- 1. Customer is a registered profile OR a guest name.
alter table public.appointments alter column customer_profile_id drop not null;
alter table public.appointments add column guest_name text;
alter table public.appointments add constraint appointments_customer_or_guest
  check (customer_profile_id is not null or nullif(btrim(guest_name), '') is not null);

alter table public.recurring_bookings alter column customer_profile_id drop not null;
alter table public.recurring_bookings add column guest_name text;
alter table public.recurring_bookings add constraint recurring_bookings_customer_or_guest
  check (customer_profile_id is not null or nullif(btrim(guest_name), '') is not null);

-- 2. A barber books on their own agenda only, for a customer of this shop
--    (or a guest). Admins already can via "admin creates on behalf".
create policy "appointments: hairdresser books own agenda" on public.appointments
  for insert with check (
    public.is_own_hairdresser(hairdresser_id)
    and created_by = auth.uid()
    and status = 'confirmed'
    and exists (
      select 1 from public.hairdressers h
      where h.id = hairdresser_id and h.organization_id = appointments.organization_id
    )
    and (
      customer_profile_id is null
      or exists (
        select 1 from public.organization_members m
        where m.profile_id = appointments.customer_profile_id
          and m.organization_id = appointments.organization_id and m.active
      )
    )
  );

create policy "recurring_bookings: hairdresser creates own active" on public.recurring_bookings
  for insert with check (
    public.is_own_hairdresser(hairdresser_id)
    and status = 'active'
    and decided_by = auth.uid()
    and exists (
      select 1 from public.hairdressers h
      where h.id = hairdresser_id and h.organization_id = recurring_bookings.organization_id
    )
    and (
      customer_profile_id is null
      or exists (
        select 1 from public.organization_members m
        where m.profile_id = recurring_bookings.customer_profile_id
          and m.organization_id = recurring_bookings.organization_id and m.active
      )
    )
  );

-- 3. Tell a registered customer the barber booked them.
alter type public.notification_event_type add value if not exists 'booked_by_hairdresser';

create or replace function public.emit_notification_event(
  p_type public.notification_event_type,
  p_appointment_id uuid default null,
  p_recurring_booking_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_hairdresser_id uuid;
  v_hairdresser_profile_id uuid;
  v_customer_profile_id uuid;
  v_recipient_profile_id uuid;
  v_event_id uuid;
  v_during tstzrange;
begin
  if p_appointment_id is not null then
    select a.organization_id, a.hairdresser_id, h.profile_id, a.customer_profile_id, a.during
      into v_organization_id, v_hairdresser_id, v_hairdresser_profile_id, v_customer_profile_id, v_during
      from public.appointments a
      join public.hairdressers h on h.id = a.hairdresser_id
      where a.id = p_appointment_id;
  elsif p_recurring_booking_id is not null then
    select rb.organization_id, h.profile_id, rb.customer_profile_id
      into v_organization_id, v_hairdresser_profile_id, v_customer_profile_id
      from public.recurring_bookings rb
      join public.hairdressers h on h.id = rb.hairdresser_id
      where rb.id = p_recurring_booking_id;
  else
    raise exception 'emit_notification_event requires an appointment or recurring booking id';
  end if;

  if not found then
    raise exception 'Referenced appointment or recurring booking not found';
  end if;

  if not public.is_org_member(v_organization_id) then
    raise exception 'Not authorized to emit notifications for this organization';
  end if;

  if p_type = 'message_received' then
    v_recipient_profile_id := case
      when v_hairdresser_profile_id = auth.uid() then v_customer_profile_id
      else v_hairdresser_profile_id
    end;
  else
    v_recipient_profile_id := case p_type
      when 'booking_confirmed' then v_hairdresser_profile_id
      when 'booking_cancelled' then v_hairdresser_profile_id
      when 'booking_cancelled_by_hairdresser' then v_customer_profile_id
      when 'schedule_changed' then v_customer_profile_id
      when 'booked_by_hairdresser' then v_customer_profile_id
      when 'recurring_request_created' then v_hairdresser_profile_id
      when 'recurring_request_approved' then v_customer_profile_id
      when 'recurring_request_rejected' then v_customer_profile_id
      else null
    end;
  end if;

  insert into public.notification_events (organization_id, type, appointment_id, recurring_booking_id)
  values (v_organization_id, p_type, p_appointment_id, p_recurring_booking_id)
  returning id into v_event_id;

  if v_recipient_profile_id is not null then
    insert into public.notifications (notification_event_id, recipient_profile_id, channel, status, sent_at)
    values (v_event_id, v_recipient_profile_id, 'in_app', 'sent', now());
  end if;

  if p_type in ('booking_cancelled', 'booking_cancelled_by_hairdresser') then
    perform public.notify_waitlist_for_freed_slot(
      p_appointment_id, v_organization_id, v_hairdresser_id, v_during, v_customer_profile_id
    );
  end if;
end;
$$;

-- 4. Guest-safe versions of functions that assumed a customer profile.
-- Reminders: skip guests (recipient_profile_id is not null).
create or replace function public.enqueue_appointment_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_event_id uuid;
begin
  for r in
    select a.id, a.organization_id, a.customer_profile_id
    from public.appointments a
    where a.status = 'confirmed'
      and a.customer_profile_id is not null -- walk-in guests have no account to notify
      and lower(a.during) >= now() + interval '22 hours'
      and lower(a.during) < now() + interval '24 hours'
      and not exists (
        select 1 from public.notification_events e
        where e.appointment_id = a.id and e.type = 'reminder_24h'
      )
  loop
    insert into public.notification_events (organization_id, type, appointment_id)
    values (r.organization_id, 'reminder_24h', r.id)
    returning id into v_event_id;

    insert into public.notifications (notification_event_id, recipient_profile_id, channel, status, sent_at)
    values (v_event_id, r.customer_profile_id, 'in_app', 'sent', now());
  end loop;
end;
$$;

-- Waitlist: "<> null" matched nobody, so a freed guest slot woke no one.
create or replace function public.notify_waitlist_for_freed_slot(
  p_appointment_id uuid,
  p_organization_id uuid,
  p_hairdresser_id uuid,
  p_freed_during tstzrange,
  p_exclude_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timezone text;
  v_day date;
  v_event_id uuid;
begin
  if p_freed_during is null or lower(p_freed_during) <= now() then return; end if;
  select o.timezone into v_timezone from public.organizations o where o.id = p_organization_id;
  v_day := (lower(p_freed_during) at time zone v_timezone)::date;

  if not exists (
    select 1 from public.waitlist_entries w
    where w.hairdresser_id = p_hairdresser_id and w.date = v_day
      and w.notified_at is null and w.customer_profile_id is distinct from p_exclude_profile_id
  ) then
    return;
  end if;

  insert into public.notification_events (organization_id, type, appointment_id)
  values (p_organization_id, 'waitlist_slot_freed', p_appointment_id)
  returning id into v_event_id;

  with woken as (
    update public.waitlist_entries w
      set notified_at = now()
      where w.hairdresser_id = p_hairdresser_id and w.date = v_day
        and w.notified_at is null and w.customer_profile_id is distinct from p_exclude_profile_id
      returning w.customer_profile_id
  )
  insert into public.notifications (notification_event_id, recipient_profile_id, channel, status, sent_at)
  select v_event_id, woken.customer_profile_id, 'in_app', 'sent', now() from woken;
end;
$$;

-- Recurring engine: copy guest_name; created_by falls back to the barber
-- who created the rule when there is no customer profile.
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

-- Reschedule reply: "<> auth.uid()" let a NULL (guest) customer slip past
-- the ownership check; only the booked customer may answer.
create or replace function public.respond_to_appointment_reschedule(p_appointment_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  v_proposed tstzrange;
begin
  select * into a from public.appointments where id = p_appointment_id;
  if not found or a.customer_profile_id is distinct from auth.uid() then raise exception 'Non autorizzato'; end if;

  select proposed_during into v_proposed
    from public.appointment_reschedule_proposals where appointment_id = a.id;
  if v_proposed is null then raise exception 'Nessuna proposta in sospeso'; end if;

  delete from public.appointment_reschedule_proposals where appointment_id = a.id;

  if p_accept then
    if a.status not in ('pending', 'confirmed') or lower(v_proposed) <= now() then
      raise exception 'La proposta non è più valida';
    end if;
    -- The exclusion constraint is the final word on overlaps (23P01).
    update public.appointments set during = v_proposed, updated_at = now() where id = a.id;
    perform public.emit_notification_event('reschedule_accepted', a.id);
  else
    perform public.emit_notification_event('reschedule_declined', a.id);
  end if;
end;
$$;
