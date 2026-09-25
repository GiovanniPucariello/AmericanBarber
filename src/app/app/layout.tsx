import { ensureCustomerMembership } from "@/lib/organizations/membership";
import { BottomNav, type NavItem } from "@/components/layout/bottom-nav";
import { NotificationBell } from "@/components/notifications/notification-bell";

const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Home", exact: true },
  { href: "/app/book", label: "Prenota", prominent: true },
  { href: "/app/appointments", label: "Appuntamenti" },
  { href: "/app/profile", label: "Profilo" },
];

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await ensureCustomerMembership();

  return (
    <div className="min-h-screen text-paper-50 pb-16">
      <NotificationBell href="/app/notifications" />
      <div className="animate-fade-in">{children}</div>
      <BottomNav items={NAV_ITEMS} />
    </div>
  );
}
