-- Second reminder to the customer, 30 minutes before the appointment
-- (alongside the 24h one). Runs every 5 minutes; the window is 25-35 min
-- ahead so each appointment is caught by exactly one or two runs, and the
-- not-exists check keeps it to one notification. Guests (no account) skipped.
alter type public.notification_event_type add value if not exists 'reminder_30m';

create or replace function public.enqueue_appointment_reminders_30m()
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
      and a.customer_profile_id is not null
      and lower(a.during) >= now() + interval '25 minutes'
      and lower(a.during) < now() + interval '35 minutes'
      and not exists (
        select 1 from public.notification_events e
        where e.appointment_id = a.id and e.type = 'reminder_30m'
      )
  loop
    insert into public.notification_events (organization_id, type, appointment_id)
    values (r.organization_id, 'reminder_30m', r.id)
    returning id into v_event_id;

    insert into public.notifications (notification_event_id, recipient_profile_id, channel, status, sent_at)
    values (v_event_id, r.customer_profile_id, 'in_app', 'sent', now());
  end loop;
end;
$$;

revoke execute on function public.enqueue_appointment_reminders_30m() from public, anon, authenticated;

select cron.schedule(
  'appointment-reminders-30m',
  '*/5 * * * *',
  $$select public.enqueue_appointment_reminders_30m()$$
);
