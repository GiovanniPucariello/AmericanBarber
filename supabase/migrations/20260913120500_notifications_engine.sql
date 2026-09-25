-- Notification fan-out (DESIGN.md section C/F). notification_events and
-- notifications have no client INSERT policy at all (Phase 4 left them
-- service-role-only on purpose) - a client-supplied recipient list would
-- let any authenticated user spam notifications at an arbitrary profile,
-- so this is a SECURITY DEFINER function that derives the recipient
-- itself from the appointment/recurring_booking row, the same pattern as
-- generate_recurring_occurrences.
--
-- Every mutation path here is customer- or hairdresser-initiated only (no
-- admin-cancel UI exists yet), so the recipient is simply "the other
-- party": the hairdresser for a booking the customer just made or
-- cancelled, or the customer for a recurring request the hairdresser just
-- decided on. A hairdresser with no linked login (profile_id null) has
-- nowhere to receive an in-app notification yet - the event is still
-- logged, just not fanned out to anyone.
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

  v_recipient_profile_id := case p_type
    when 'booking_confirmed' then v_hairdresser_profile_id
    when 'booking_cancelled' then v_hairdresser_profile_id
    when 'recurring_request_created' then v_hairdresser_profile_id
    when 'recurring_request_approved' then v_customer_profile_id
    when 'recurring_request_rejected' then v_customer_profile_id
    else null
  end;

  insert into public.notification_events (organization_id, type, appointment_id, recurring_booking_id)
  values (v_organization_id, p_type, p_appointment_id, p_recurring_booking_id)
  returning id into v_event_id;

  if v_recipient_profile_id is not null then
    insert into public.notifications (notification_event_id, recipient_profile_id, channel, status, sent_at)
    values (v_event_id, v_recipient_profile_id, 'in_app', 'sent', now());
  end if;
end;
$$;

grant execute on function public.emit_notification_event(public.notification_event_type, uuid, uuid) to authenticated;

-- notification_feed: the read-side counterpart. notification_events carries
-- no RLS policy (service-role only), so a plain join through it would fail
-- for 'authenticated' - like co_member_profiles, a view runs with its
-- owner's table privileges, so this can join freely as long as the WHERE
-- clause itself is the only access boundary (own rows, by recipient_profile_id).
create view public.notification_feed as
select
  n.id as notification_id,
  ne.type as event_type,
  ne.appointment_id,
  ne.recurring_booking_id,
  ne.created_at,
  n.status,
  n.read_at,
  h.display_name as hairdresser_name,
  s.name as service_name,
  coalesce(a.during, null) as during
from public.notifications n
join public.notification_events ne on ne.id = n.notification_event_id
left join public.appointments a on a.id = ne.appointment_id
left join public.recurring_bookings rb on rb.id = ne.recurring_booking_id
left join public.hairdressers h on h.id = coalesce(a.hairdresser_id, rb.hairdresser_id)
left join public.services s on s.id = coalesce(a.service_id, rb.service_id)
where n.recipient_profile_id = auth.uid();

grant select on public.notification_feed to authenticated;
