-- Customer-experience features: prices, barber Instagram, preferred barber,
-- staff-only customer notes, and the "avvisami se si libera" waitlist.

-- ---------------------------------------------------------------------------
-- Launch prices (Barba 10, Taglio 20, Taglio + Barba 30).
-- ---------------------------------------------------------------------------
update public.services set price_cents = 2000 where id = '00000000-0000-0000-0000-000000000301';
update public.services set price_cents = 1000 where id = '00000000-0000-0000-0000-000000000302';
update public.services set price_cents = 3000 where id = '00000000-0000-0000-0000-000000000303';

-- ---------------------------------------------------------------------------
-- Barber Instagram handle (without "@"), shown as their portfolio link.
-- ---------------------------------------------------------------------------
alter table public.hairdressers add column instagram_handle text
  check (instagram_handle is null or instagram_handle ~ '^[A-Za-z0-9._]{1,30}$');

update public.hairdressers set instagram_handle = 'angelobarberscarlatella'
  where id = '00000000-0000-0000-0000-000000000201';
update public.hairdressers set instagram_handle = 'tonti.alessandro'
  where id = '00000000-0000-0000-0000-000000000202';

-- ---------------------------------------------------------------------------
-- Preferred barber, per customer per organization. Own row only.
-- ---------------------------------------------------------------------------
create table public.customer_preferences (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  preferred_hairdresser_id uuid references public.hairdressers(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (organization_id, profile_id)
);

alter table public.customer_preferences enable row level security;

create policy "customer_preferences: read own" on public.customer_preferences
  for select using (profile_id = auth.uid());
create policy "customer_preferences: insert own" on public.customer_preferences
  for insert with check (profile_id = auth.uid() and public.is_org_member(organization_id));
create policy "customer_preferences: update own" on public.customer_preferences
  for update using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and public.is_org_member(organization_id));
create policy "customer_preferences: delete own" on public.customer_preferences
  for delete using (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Customer notes ("sfumatura 1,5 ai lati"). Staff only - customers never
-- see them, not even their own.
-- ---------------------------------------------------------------------------
create table public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_profile_id uuid not null references public.profiles(id) on delete cascade,
  author_profile_id uuid references public.profiles(id) on delete set null,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index customer_notes_customer_idx
  on public.customer_notes (organization_id, customer_profile_id, created_at desc);

alter table public.customer_notes enable row level security;

create policy "customer_notes: staff read" on public.customer_notes
  for select using (public.is_org_member(organization_id, 'hairdresser'));
create policy "customer_notes: staff insert" on public.customer_notes
  for insert with check (
    public.is_org_member(organization_id, 'hairdresser') and author_profile_id = auth.uid()
  );
create policy "customer_notes: author or admin deletes" on public.customer_notes
  for delete using (
    author_profile_id = auth.uid() or public.is_org_member(organization_id, 'admin')
  );

-- ---------------------------------------------------------------------------
-- Waitlist: "avvisami se si libera un posto con X in questo giorno".
-- ---------------------------------------------------------------------------
create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_profile_id uuid not null references public.profiles(id) on delete cascade,
  hairdresser_id uuid not null references public.hairdressers(id) on delete cascade,
  date date not null,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (customer_profile_id, hairdresser_id, date)
);

create index waitlist_entries_lookup_idx on public.waitlist_entries (hairdresser_id, date);

alter table public.waitlist_entries enable row level security;

create policy "waitlist_entries: read own or staff" on public.waitlist_entries
  for select using (
    customer_profile_id = auth.uid() or public.is_org_member(organization_id, 'hairdresser')
  );
create policy "waitlist_entries: insert own" on public.waitlist_entries
  for insert with check (
    customer_profile_id = auth.uid()
    and public.is_org_member(organization_id)
    and exists (
      select 1 from public.hairdressers h
      where h.id = hairdresser_id and h.organization_id = waitlist_entries.organization_id
    )
  );
create policy "waitlist_entries: delete own" on public.waitlist_entries
  for delete using (customer_profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- emit_notification_event: unchanged, plus on 'booking_cancelled' of a
-- future appointment, notify everyone waiting on that barber + local day
-- (once - notified_at is set so a second cancellation doesn't re-spam).
-- ---------------------------------------------------------------------------
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

  if p_type = 'booking_cancelled' and v_during is not null and lower(v_during) > now() then
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
