import { requireOrgRole } from "@/lib/permissions/require-role";
import { TopBar } from "@/components/layout/top-bar";
import { BottomNav, type NavItem } from "@/components/layout/bottom-nav";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { SignOutButton } from "@/components/layout/sign-out-button";

const NAV_ITEMS: NavItem[] = [
  { href: "/hairdresser", label: "Agenda", icon: "calendar", exact: true },
  { href: "/hairdresser/requests", label: "Richieste", icon: "inbox" },
  { href: "/hairdresser/customers", label: "Clienti", icon: "users" },
  { href: "/hairdresser/availability", label: "Orari", icon: "clock" },
  { href: "/hairdresser/profile", label: "Profilo", icon: "user" },
];

export default async function HairdresserLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireOrgRole("hairdresser");

  return (
    <div className="min-h-screen text-paper-50 pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <TopBar homeHref="/hairdresser">
        <div className="flex items-center">
          <NotificationBell href="/hairdresser/notifications" />
          <SignOutButton />
        </div>
      </TopBar>
      <main className="animate-fade-in max-w-2xl mx-auto">{children}</main>
      <BottomNav items={NAV_ITEMS} />
    </div>
  );
}
