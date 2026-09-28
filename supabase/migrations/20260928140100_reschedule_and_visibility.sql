-- Barber/customer relationship fixes:
--  1. co_member_profiles leaked every customer's name to every other
--     customer. Now: customers see staff (+ themselves); staff see everyone,
--     including the customer's phone so a barber can call about a delay.
--  2. Customers could flag past/completed appointments as cancelled via
--     the API - only upcoming active ones now (the app already checked).
--  3. Reschedule: the barber proposes a new time, the customer accepts or
--     declines. Both go through SECURITY DEFINER functions, since
--     customers have no UPDATE grant on appointments.during.
--  4. Notifications for the new interactions, incl. barber-side cancel.

-- 1 -------------------------------------------------------------------------
drop view public.co_member_profiles;

create view public.co_member_profiles as
select
  p.id,
  p.full_name,
  p.avatar_url,
  case when viewer.is_staff then p.phone end as phone
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

-- 2 -------------------------------------------------------------------------
drop policy "appointments: customer cancels own" on public.appointments;

create policy "appointments: customer cancels own" on public.appointments
  for update using (
    customer_profile_id = auth.uid()
    and status in ('pending', 'confirmed')
    and lower(during) > now()
  )
  with check (customer_profile_id = auth.uid() and status = 'cancelled');

-- 3 -------------------------------------------------------------------------
create table public.appointment_reschedule_proposals (
  appointment_id uuid primary key references public.appointments(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  proposed_during tstzrange not null,
  proposed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.appointment_reschedule_proposals enable row level security;

-- Read-only for the two parties (+ admin); writes only via the functions.
create policy "reschedule_proposals: parties read" on public.appointment_reschedule_proposals
  for select using (
    exists (
      select 1 from public.appointments a
      where a.id = appointment_id
        and (a.customer_profile_id = auth.uid()
             or public.is_own_hairdresser(a.hairdresser_id)
             or public.is_org_member(a.organization_id, 'admin'))
    )
  );

create or replace function public.propose_appointment_reschedule(p_appointment_id uuid, p_new_start timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  v_new tstzrange;
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

  v_new := tstzrange(p_new_start, p_new_start + (upper(a.during) - lower(a.during)), '[)');

  if exists (
    select 1 from public.appointments o
    where o.hairdresser_id = a.hairdresser_id
      and o.id <> a.id
      and o.status in ('pending', 'confirmed')
      and o.during && v_new
  ) then
    raise exception 'Orario già occupato' using errcode = '23P01';
  end if;

  insert into public.appointment_reschedule_proposals (appointment_id, organization_id, proposed_during, proposed_by)
  values (a.id, a.organization_id, v_new, auth.uid())
  on conflict (appointment_id) do update
    set proposed_during = excluded.proposed_during, proposed_by = excluded.proposed_by, created_at = now();

  perform public.emit_notification_event('reschedule_proposed', a.id);
end;
$$;

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
  if not found or a.customer_profile_id <> auth.uid() then raise exception 'Non autorizzato'; end if;

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

revoke execute on function public.propose_appointment_reschedule(uuid, timestamptz) from public, anon;
revoke execute on function public.respond_to_appointment_reschedule(uuid, boolean) from public, anon;
grant execute on function public.propose_appointment_reschedule(uuid, timestamptz) to authenticated;
grant execute on function public.respond_to_appointment_reschedule(uuid, boolean) to authenticated;

-- 4 -------------------------------------------------------------------------
-- Same as 20260928090100's version, plus the new event types and the
-- waitlist fan-out also firing when the barber cancels.
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
  v_timezone text;
  v_waitlist_event_id uuid;
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
      when 'recurring_request_created' then v_hairdresser_profile_id
      when 'recurring_request_approved' then v_customer_profile_id
      when 'recurring_request_rejected' then v_customer_profile_id
      when 'reschedule_proposed' then v_customer_profile_id
      when 'reschedule_accepted' then v_hairdresser_profile_id
      when 'reschedule_declined' then v_hairdresser_profile_id
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

  if p_type in ('booking_cancelled', 'booking_cancelled_by_hairdresser')
     and v_during is not null and lower(v_during) > now() then
    select o.timezone into v_timezone from public.organizations o where o.id = v_organization_id;

    if exists (
      select 1 from public.waitlist_entries w
      where w.hairdresser_id = v_hairdresser_id
        and w.date = (lower(v_during) at time zone v_timezone)::date
        and w.notified_at is null
        and w.customer_profile_id <> v_customer_profile_id
    ) then
      insert into public.notification_events (organization_id, type, appointment_id)
      values (v_organization_id, 'waitlist_slot_freed', p_appointment_id)
      returning id into v_waitlist_event_id;

      with woken as (
        update public.waitlist_entries w
          set notified_at = now()
          where w.hairdresser_id = v_hairdresser_id
            and w.date = (lower(v_during) at time zone v_timezone)::date
            and w.notified_at is null
            and w.customer_profile_id <> v_customer_profile_id
          returning w.customer_profile_id
      )
      insert into public.notifications (notification_event_id, recipient_profile_id, channel, status, sent_at)
      select v_waitlist_event_id, woken.customer_profile_id, 'in_app', 'sent', now() from woken;
    end if;
  end if;
end;
$$;
