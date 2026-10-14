-- Private calendar subscription link per barber ("Sincronizza calendario"):
-- the phone's calendar app polls /api/calendar/<token> and stays in sync.
-- The feed carries customer names and phones, so the token lives in its own
-- table readable only by that barber - not on hairdressers, which every
-- shop member (customers included) can read.
create table public.calendar_feeds (
  hairdresser_id uuid primary key references public.hairdressers(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.calendar_feeds enable row level security;

create policy "calendar_feeds: own barber reads" on public.calendar_feeds
  for select using (public.is_own_hairdresser(hairdresser_id));

create policy "calendar_feeds: own barber creates" on public.calendar_feeds
  for insert with check (public.is_own_hairdresser(hairdresser_id));

-- Regenerating the link (old one stops working) = delete + insert.
create policy "calendar_feeds: own barber deletes" on public.calendar_feeds
  for delete using (public.is_own_hairdresser(hairdresser_id));

grant select, insert, delete on public.calendar_feeds to authenticated;
