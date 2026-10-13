-- The shop's booking times are the same for every barber by default (each
-- barber can still edit their own from Orari):
--   Mon closed; Tue-Thu 08:20-20:00; Fri 08:20-21:00; Sat 07:45-20:00; Sun closed
--   starts Tue-Thu 08:20 09:00 09:45 10:20 11:00 11:45 12:20 14:20 15:00
--   15:30 16:00 16:45 17:20 18:00 18:30 19:00 19:45; Fri adds 13:45; Sat
--   adds 07:45 and 13:45.

-- 1. Same start-time list for everyone, and the default for new barbers.
alter table public.hairdressers alter column slot_times set default '{"1": ["08:20", "09:00", "09:45", "10:20", "11:00", "11:45", "12:20", "14:20", "15:00", "15:30", "16:00", "16:45", "17:20", "18:00", "18:30", "19:00", "19:45"], "2": ["08:20", "09:00", "09:45", "10:20", "11:00", "11:45", "12:20", "14:20", "15:00", "15:30", "16:00", "16:45", "17:20", "18:00", "18:30", "19:00", "19:45"], "3": ["08:20", "09:00", "09:45", "10:20", "11:00", "11:45", "12:20", "14:20", "15:00", "15:30", "16:00", "16:45", "17:20", "18:00", "18:30", "19:00", "19:45"], "4": ["08:20", "09:00", "09:45", "10:20", "11:00", "11:45", "12:20", "13:45", "14:20", "15:00", "15:30", "16:00", "16:45", "17:20", "18:00", "18:30", "19:00", "19:45"], "5": ["07:45", "08:20", "09:00", "09:45", "10:20", "11:00", "11:45", "12:20", "13:45", "14:20", "15:00", "15:30", "16:00", "16:45", "17:20", "18:00", "18:30", "19:00", "19:45"]}'::jsonb;
update public.hairdressers set slot_times = '{"1": ["08:20", "09:00", "09:45", "10:20", "11:00", "11:45", "12:20", "14:20", "15:00", "15:30", "16:00", "16:45", "17:20", "18:00", "18:30", "19:00", "19:45"], "2": ["08:20", "09:00", "09:45", "10:20", "11:00", "11:45", "12:20", "14:20", "15:00", "15:30", "16:00", "16:45", "17:20", "18:00", "18:30", "19:00", "19:45"], "3": ["08:20", "09:00", "09:45", "10:20", "11:00", "11:45", "12:20", "14:20", "15:00", "15:30", "16:00", "16:45", "17:20", "18:00", "18:30", "19:00", "19:45"], "4": ["08:20", "09:00", "09:45", "10:20", "11:00", "11:45", "12:20", "13:45", "14:20", "15:00", "15:30", "16:00", "16:45", "17:20", "18:00", "18:30", "19:00", "19:45"], "5": ["07:45", "08:20", "09:00", "09:45", "10:20", "11:00", "11:45", "12:20", "13:45", "14:20", "15:00", "15:30", "16:00", "16:45", "17:20", "18:00", "18:30", "19:00", "19:45"]}'::jsonb;

-- 2. Same weekly hours for everyone (replaces their old Mon-Sat 08-22 rows).
delete from public.availability_rules;

create or replace function public.add_default_availability_rules(p_hairdresser_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.availability_rules (organization_id, hairdresser_id, location_id, weekday, start_time, end_time)
  select h.organization_id, h.id, l.id, d.weekday, d.start_time, d.end_time
  from public.hairdressers h
  cross join lateral (
    select id from public.locations where organization_id = h.organization_id order by created_at limit 1
  ) l
  cross join (values
    (1, time '08:20', time '20:00'),
    (2, time '08:20', time '20:00'),
    (3, time '08:20', time '20:00'),
    (4, time '08:20', time '21:00'),
    (5, time '07:45', time '20:00')
  ) as d(weekday, start_time, end_time)
  where h.id = p_hairdresser_id;
$$;

revoke execute on function public.add_default_availability_rules(uuid) from public, anon, authenticated;

select public.add_default_availability_rules(id) from public.hairdressers;

-- 3. New barbers start with the same hours.
create or replace function public.hairdressers_default_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.add_default_availability_rules(new.id);
  return new;
end;
$$;

create trigger hairdressers_default_rules
  after insert on public.hairdressers
  for each row execute function public.hairdressers_default_rules();
