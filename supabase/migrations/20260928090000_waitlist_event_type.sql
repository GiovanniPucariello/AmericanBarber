-- New enum values can't be used in the same transaction they're added in -
-- own migration, strictly before the waitlist fan-out that references it.
alter type public.notification_event_type add value if not exists 'waitlist_slot_freed';
