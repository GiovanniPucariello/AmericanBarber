import { ensureCustomerMembership } from "@/lib/organizations/membership";
import { TopBar } from "@/components/layout/top-bar";
import { BottomNav, type NavItem } from "@/components/layout/bottom-nav";
import { NotificationBell } from "@/components/notifications/notification-bell";

const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Home", icon: "home", exact: true },
  { href: "/app/book", label: "Prenota", icon: "scissors", prominent: true },
  { href: "/app/appointments", label: "Appuntamenti", icon: "calendar" },
  { href: "/app/profile", label: "Profilo", icon: "user" },
];

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await ensureCustomerMembership();

  return (
    <div className="min-h-screen text-paper-50 pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <TopBar homeHref="/app">
        <NotificationBell href="/app/notifications" />
      </TopBar>
      <main className="animate-fade-in max-w-2xl mx-auto">{children}</main>
      <BottomNav items={NAV_ITEMS} />
    </div>
  );
}
