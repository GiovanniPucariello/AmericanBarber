-- Adds the customer's name to notification_feed - useful on the
-- hairdresser side (booking_confirmed/booking_cancelled/
-- recurring_request_created all notify the hairdresser about a specific
-- customer). Same bypass-RLS-via-view-ownership reasoning as
-- co_member_profiles; still scoped to the recipient's own rows only.
drop view public.notification_feed;

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
  coalesce(a.during, null) as during,
  p.full_name as customer_name
from public.notifications n
join public.notification_events ne on ne.id = n.notification_event_id
left join public.appointments a on a.id = ne.appointment_id
left join public.recurring_bookings rb on rb.id = ne.recurring_booking_id
left join public.hairdressers h on h.id = coalesce(a.hairdresser_id, rb.hairdresser_id)
left join public.services s on s.id = coalesce(a.service_id, rb.service_id)
left join public.profiles p on p.id = coalesce(a.customer_profile_id, rb.customer_profile_id)
where n.recipient_profile_id = auth.uid();

grant select on public.notification_feed to authenticated;
