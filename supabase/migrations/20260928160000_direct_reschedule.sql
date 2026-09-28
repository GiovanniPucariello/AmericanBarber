-- The barber moves appointments directly (they know their own schedule) -
-- no customer acceptance step. Replaces the propose/respond flow from
-- 20260928140100. The customer gets a 'schedule_changed' notification, and
-- the freed old slot wakes that day's waitlist like a cancellation does.
-- Also exposes whether a co-member is a customer, so staff can list
-- customers (customers still only ever see staff + themselves).

drop function public.propose_appointment_reschedule(uuid, timestamptz);
drop function public.respond_to_appointment_reschedule(uuid, boolean);
drop table public.appointment_reschedule_proposals;

-- Waitlist wake-up, shared by cancellations and reschedules.
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
      and w.notified_at is null and w.customer_profile_id <> p_exclude_profile_id
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
        and w.notified_at is null and w.customer_profile_id <> p_exclude_profile_id
      returning w.customer_profile_id
  )
  insert into public.notifications (notification_event_id, recipient_profile_id, channel, status, sent_at)
  select v_event_id, woken.customer_profile_id, 'in_app', 'sent', now() from woken;
end;
$$;

revoke execute on function public.notify_waitlist_for_freed_slot(uuid, uuid, uuid, tstzrange, uuid) from public, anon, authenticated;

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

create or replace function public.reschedule_appointment(p_appointment_id uuid, p_new_start timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
begin
  select * into a from public.appointments where id = p_appointment_id;
  if not found then raise exception 'Appuntamento non trovato'; end if;
  if not (public.is_own_hairdresser(a.hairdresser_id) or public.is_org_member(a.organization_id, 'admin')) then
    raise exception 'Non autorizzato';
  end if;
  if a.status not in ('pending', 'confirmed') or lower(a.during) <= now() then
    raise exception 'Si possono spostare solo appuntamenti futuri attivi';
  end if;
  if p_new_start <= now() then raise exception 'Il nuovo orario deve essere nel futuro'; end if;

  -- The exclusion constraint rejects overlaps (23P01).
  update public.appointments
    set during = tstzrange(p_new_start, p_new_start + (upper(a.during) - lower(a.during)), '[)'),
        updated_at = now()
    where id = a.id;

  perform public.emit_notification_event('schedule_changed', a.id);
  perform public.notify_waitlist_for_freed_slot(a.id, a.organization_id, a.hairdresser_id, a.during, a.customer_profile_id);
end;
$$;

revoke execute on function public.reschedule_appointment(uuid, timestamptz) from public, anon;
grant execute on function public.reschedule_appointment(uuid, timestamptz) to authenticated;

-- co_member_profiles + is_customer (staff use it to list customers).
drop view public.co_member_profiles;

create view public.co_member_profiles as
select
  p.id,
  p.full_name,
  p.avatar_url,
  case when viewer.is_staff then p.phone end as phone,
  not exists (
    select 1 from public.organization_members s
    where s.profile_id = p.id and s.active and s.role <> 'customer'
  ) as is_customer
from public.profiles p
cross join lateral (
  select exists (
    select 1 from public.organization_members m
    where m.profile_id = auth.uid() and m.active and m.role <> 'customer'
  ) as is_staff
) viewer
where exists (
  select 1
  from public.organization_members mine
  join public.organization_members theirs on theirs.organization_id = mine.organization_id
  where mine.profile_id = auth.uid()
    and mine.active
    and theirs.profile_id = p.id
    and theirs.active
    and (p.id = auth.uid() or mine.role <> 'customer' or theirs.role <> 'customer')
);

grant select on public.co_member_profiles to authenticated;
