-- New enum values must be committed before use - own migration.
alter type public.notification_event_type add value if not exists 'reschedule_proposed';
alter type public.notification_event_type add value if not exists 'reschedule_accepted';
alter type public.notification_event_type add value if not exists 'reschedule_declined';
alter type public.notification_event_type add value if not exists 'booking_cancelled_by_hairdresser';
