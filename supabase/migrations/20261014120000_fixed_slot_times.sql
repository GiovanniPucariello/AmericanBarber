-- Replaces the 30/45 alternating experiment (20261013120000) with what the
-- shop actually uses: a fixed list of booking start times per weekday.
-- slot_times: {"<weekday 0=Mon..6>": ["HH:MM", ...]}. A day listed here
-- offers exactly those starts (still inside the barber's opening hours and
-- outside exceptions); a day not listed - or null - uses the service grid.
-- alternating_slots is left in place (unused, switched off) so a deploy still
-- running the previous code keeps working; drop it in a later migration.
update public.hairdressers set alternating_slots = false;
alter table public.hairdressers add column slot_times jsonb
  check (slot_times is null or jsonb_typeof(slot_times) = 'object');

-- Cimbone: Tue-Thu list; Friday adds 13:45; Saturday adds 07:45 and 13:45.
update public.hairdressers set slot_times = '{"1": ["08:20", "09:00", "09:45", "10:20", "11:00", "11:45", "12:20", "14:20", "15:00", "15:30", "16:00", "16:45", "17:20", "18:00", "18:30", "19:00", "19:45"], "2": ["08:20", "09:00", "09:45", "10:20", "11:00", "11:45", "12:20", "14:20", "15:00", "15:30", "16:00", "16:45", "17:20", "18:00", "18:30", "19:00", "19:45"], "3": ["08:20", "09:00", "09:45", "10:20", "11:00", "11:45", "12:20", "14:20", "15:00", "15:30", "16:00", "16:45", "17:20", "18:00", "18:30", "19:00", "19:45"], "4": ["08:20", "09:00", "09:45", "10:20", "11:00", "11:45", "12:20", "13:45", "14:20", "15:00", "15:30", "16:00", "16:45", "17:20", "18:00", "18:30", "19:00", "19:45"], "5": ["07:45", "08:20", "09:00", "09:45", "10:20", "11:00", "11:45", "12:20", "13:45", "14:20", "15:00", "15:30", "16:00", "16:45", "17:20", "18:00", "18:30", "19:00", "19:45"]}'::jsonb
  where id = '00000000-0000-0000-0000-000000000202';
