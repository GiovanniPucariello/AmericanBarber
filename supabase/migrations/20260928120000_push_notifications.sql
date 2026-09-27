-- Web push delivery + day-before reminders.
--
-- Flow: any insert into notifications (booking, waitlist, message,
-- reminder...) -> trigger -> pg_net POSTs the notification id to the app's
-- /api/push/dispatch route -> the app sends the push with its VAPID key.
-- The app URL and shared secret live in Supabase Vault (set outside git):
--   select vault.create_secret('<url>', 'push_dispatch_url');
--   select vault.create_secret('<secret>', 'push_dispatch_secret');
-- With no secrets set, the trigger is a no-op (in-app notifications only).

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

-- ---------------------------------------------------------------------------
-- One row per device/browser a user enabled notifications on.
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_profile_idx on public.push_subscriptions (profile_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: read own" on public.push_subscriptions
  for select using (profile_id = auth.uid());
create policy "push_subscriptions: insert own" on public.push_subscriptions
  for insert with check (profile_id = auth.uid());
create policy "push_subscriptions: delete own" on public.push_subscriptions
  for delete using (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Fan-out trigger: only calls out when the recipient has a subscription.
-- ---------------------------------------------------------------------------
create or replace function public.dispatch_push_for_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
begin
  if not exists (select 1 from public.push_subscriptions s where s.profile_id = new.recipient_profile_id) then
    return new;
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_dispatch_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_dispatch_secret';
  if v_url is null or v_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('notificationId', new.id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    )
  );
  return new;
end;
$$;

create trigger notifications_dispatch_push
  after insert on public.notifications
  for each row execute function public.dispatch_push_for_notification();

-- ---------------------------------------------------------------------------
-- Day-before reminders: hourly, for confirmed appointments starting 22-24h
-- from now (2h window so one delayed/missed cron run doesn't drop anyone),
-- once per appointment (guarded by the reminder_24h event).
-- ---------------------------------------------------------------------------
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

revoke execute on function public.enqueue_appointment_reminders() from public, anon, authenticated;

select cron.schedule(
  'appointment-reminders',
  '5 * * * *',
  $$select public.enqueue_appointment_reminders()$$
);
