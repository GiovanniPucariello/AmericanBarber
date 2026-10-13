import Link from "next/link";
import { requireOrgRole } from "@/lib/permissions/require-role";
import { getCurrentHairdresser } from "@/lib/hairdressers/queries";
import { TopBar } from "@/components/layout/top-bar";
import { BottomNav, type NavItem } from "@/components/layout/bottom-nav";

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "grid", exact: true },
  { href: "/admin/calendar", label: "Calendario", icon: "calendar" },
  { href: "/admin/staff", label: "Personale", icon: "users" },
  { href: "/admin/settings", label: "Impostazioni", icon: "settings" },
];

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const organization = await requireOrgRole("admin");
  const hairdresser = await getCurrentHairdresser(organization.id);

  return (
    <div className="min-h-screen text-paper-50 pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <TopBar homeHref="/admin">
        {hairdresser && (
          <Link href="/hairdresser" className="h-11 px-2 flex items-center text-sm underline underline-offset-2">
            La mia agenda
          </Link>
        )}
      </TopBar>
      <main className="animate-fade-in">{children}</main>
      <BottomNav items={NAV_ITEMS} />
    </div>
  );
}
