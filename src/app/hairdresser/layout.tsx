import { requireOrgRole } from "@/lib/permissions/require-role";
import { BottomNav, type NavItem } from "@/components/layout/bottom-nav";
import { NotificationBell } from "@/components/notifications/notification-bell";

const NAV_ITEMS: NavItem[] = [
  { href: "/hairdresser", label: "Agenda", exact: true },
  { href: "/hairdresser/requests", label: "Richieste" },
  { href: "/hairdresser/availability", label: "Disponibilità" },
  { href: "/hairdresser/profile", label: "Profilo" },
];

export default async function HairdresserLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireOrgRole("hairdresser");

  return (
    <div className="min-h-screen text-paper-50 pb-16">
      <NotificationBell href="/hairdresser/notifications" />
      <div className="animate-fade-in">{children}</div>
      <BottomNav items={NAV_ITEMS} />
    </div>
  );
}
