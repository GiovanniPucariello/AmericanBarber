-- Enable RLS on every business table the moment it exists, before any
-- policies are written. With RLS on and zero policies, anon/authenticated
-- get no access at all (service_role still bypasses RLS) - this closes the
-- window between schema creation and Phase 4's actual policies, which
-- matters because this project is a live, publicly reachable database.
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.locations enable row level security;
alter table public.hairdressers enable row level security;
alter table public.services enable row level security;
alter table public.hairdresser_services enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.blocked_slots enable row level security;
alter table public.appointments enable row level security;
alter table public.recurring_bookings enable row level security;
alter table public.recurring_booking_occurrences enable row level security;
alter table public.notification_events enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
