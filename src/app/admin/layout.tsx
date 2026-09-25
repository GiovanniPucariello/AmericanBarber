import { requireOrgRole } from "@/lib/permissions/require-role";
import { BottomNav, type NavItem } from "@/components/layout/bottom-nav";

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/calendar", label: "Calendario" },
  { href: "/admin/staff", label: "Personale" },
  { href: "/admin/settings", label: "Impostazioni" },
];

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireOrgRole("admin");

  return (
    <div className="min-h-screen text-paper-50 pb-16">
      <div className="animate-fade-in">{children}</div>
      <BottomNav items={NAV_ITEMS} />
    </div>
  );
}
