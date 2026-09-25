-- Phase 14 (Notifications, DESIGN.md section C/N) scopes this pass to
-- in-app delivery only (no email/SMS provider configured yet) - the
-- channel enum needs a value for that. New enum values can't be used in
-- the same transaction they're added in, so this is its own migration,
-- strictly before the function/view that reference it.
alter type public.notification_channel add value if not exists 'in_app';
