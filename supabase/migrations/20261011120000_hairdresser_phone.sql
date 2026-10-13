-- Barber's own optional phone number, shown to customers next to their
-- Instagram link. Same format rule as profiles.phone (profileSchema).
alter table public.hairdressers add column phone text
  check (phone is null or phone ~ '^\+?[0-9 ]{6,20}$');
