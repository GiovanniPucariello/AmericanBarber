-- New enum values can't be used in the same transaction they're added in
-- (see 20260913120000_notification_channel_in_app.sql) - this is its own
-- migration, strictly before appointment_messages and the
-- emit_notification_event update that reference it.
alter type public.notification_event_type add value if not exists 'message_received';
