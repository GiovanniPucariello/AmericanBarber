-- Appointment messaging (docs/superpowers/specs/2026-09-19-appointment-messaging-design.md):
-- a customer and their assigned hairdresser can exchange short messages
-- tied to one appointment. No sender_role column - who sent a message is
-- derived by comparing sender_profile_id against the appointment's own
-- customer_profile_id / assigned hairdresser's profile_id at read time
-- (same derivation notification_feed already uses), so neither side can
-- spoof being "the barber".
create table public.appointment_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index appointment_messages_appointment_idx
  on public.appointment_messages(appointment_id, created_at);

alter table public.appointment_messages enable row level security;

-- Same shape as "appointments: read own, assigned, or admin" - a thread is
-- visible to whoever the appointment itself is visible to.
create policy "appointment_messages: read own, assigned, or admin" on public.appointment_messages
  for select using (
    exists (
      select 1 from public.appointments a
      where a.id = appointment_id
        and (
          a.customer_profile_id = auth.uid()
          or public.is_own_hairdresser(a.hairdresser_id)
          or public.is_org_member(a.organization_id, 'admin')
        )
    )
  );

-- Admin is deliberately excluded here - admin isn't a party to the
-- conversation, only an observer (same read access every other
-- appointment-linked table grants admin, nothing more). Restricted to
-- pending/confirmed appointments: nothing left to coordinate once an
-- appointment is cancelled/completed, though the thread stays readable.
create policy "appointment_messages: sender is a party, appt active" on public.appointment_messages
  for insert with check (
    sender_profile_id = auth.uid()
    and exists (
      select 1 from public.appointments a
      where a.id = appointment_id
        and a.status in ('pending', 'confirmed')
        and (a.customer_profile_id = auth.uid() or public.is_own_hairdresser(a.hairdresser_id))
    )
  );

-- Column-restricted to read_at, same "revoke update / grant update (col)"
-- pattern the appointments table already uses - and only the recipient
-- (the party who is NOT the sender) can mark a message read.
revoke update on public.appointment_messages from authenticated;
grant update (read_at) on public.appointment_messages to authenticated;

create policy "appointment_messages: recipient marks read" on public.appointment_messages
  for update using (
    sender_profile_id != auth.uid()
    and exists (
      select 1 from public.appointments a
      where a.id = appointment_id
        and (a.customer_profile_id = auth.uid() or public.is_own_hairdresser(a.hairdresser_id))
    )
  )
  with check (
    sender_profile_id != auth.uid()
    and exists (
      select 1 from public.appointments a
      where a.id = appointment_id
        and (a.customer_profile_id = auth.uid() or public.is_own_hairdresser(a.hairdresser_id))
    )
  );

-- emit_notification_event: every other event type has a fixed direction
-- (e.g. a booking confirmation always notifies the hairdresser), but a
-- message can come from either side of the same appointment - recipient is
-- "whichever party isn't the caller", not a fixed mapping. message_received
-- is special-cased ahead of the flat case/when every other type uses.
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
  v_hairdresser_profile_id uuid;
  v_customer_profile_id uuid;
  v_recipient_profile_id uuid;
  v_event_id uuid;
begin
  if p_appointment_id is not null then
    select a.organization_id, h.profile_id, a.customer_profile_id
      into v_organization_id, v_hairdresser_profile_id, v_customer_profile_id
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
end;
$$;
