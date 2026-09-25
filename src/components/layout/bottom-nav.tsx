"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; exact?: boolean; prominent?: boolean };

// Safe-area padding (section 71) so it clears the home-indicator area on
// iPhone. `prominent` is used by the customer nav to make "Prenota" stand
// out (section 41); the hairdresser nav (section 70) treats all four tabs
// equally.
export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-ink-900 border-t border-paper-50/10 flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 h-16 flex flex-col items-center justify-center gap-0.5 text-xs ${
              item.prominent
                ? "text-accent font-semibold"
                : isActive
                  ? "text-paper-50"
                  : "text-paper-50/50"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
