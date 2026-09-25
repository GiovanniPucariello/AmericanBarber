-- Extensions
create extension if not exists pgcrypto;    -- gen_random_uuid()
create extension if not exists btree_gist;  -- exclusion constraints on ranges (booking engine, section E)

-- Enums (DESIGN.md section C)
create type public.org_role as enum ('customer', 'hairdresser', 'manager', 'admin', 'owner');

create type public.appointment_status as enum (
  'pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show'
);

create type public.recurring_booking_status as enum (
  'pending_approval', 'active', 'rejected', 'cancelled'
);

create type public.recurring_occurrence_status as enum (
  'scheduled', 'confirmed', 'conflict', 'cancelled', 'skipped', 'rescheduled', 'completed', 'no_show'
);

create type public.availability_exception_type as enum (
  'unavailable_all_day', 'unavailable_range', 'extra_range'
);

create type public.notification_event_type as enum (
  'booking_created', 'booking_confirmed', 'booking_rejected', 'booking_cancelled',
  'recurring_request_created', 'recurring_request_approved', 'recurring_request_rejected',
  'reminder_24h', 'reminder_1h', 'schedule_changed'
);

create type public.notification_channel as enum ('email', 'push', 'sms', 'whatsapp');

create type public.notification_status as enum ('pending', 'sent', 'failed', 'read');

-- Shared trigger to keep updated_at honest without relying on the app layer.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
