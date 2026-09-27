"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon, type IconName } from "./nav-icon";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  exact?: boolean;
  prominent?: boolean;
};

// Safe-area padding (section 71) so it clears the home-indicator area on
// iPhone. `prominent` is used by the customer nav to make "Prenota" stand
// out (section 41) as a filled red button; the hairdresser nav (section 70)
// treats all four tabs equally.
export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-20 bg-ink-900/95 backdrop-blur border-t border-paper-50/10 flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

        if (item.prominent) {
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className="flex-1 h-16 flex items-center justify-center"
            >
              <span
                className={`h-11 px-4 rounded-full flex items-center gap-1.5 text-sm font-semibold text-paper-50 transition-[background-color,transform] active:scale-[0.96] ${
                  isActive ? "bg-accent-hover ring-2 ring-paper-50/30" : "bg-accent"
                }`}
              >
                <NavIcon name={item.icon} className="w-5 h-5" />
                {item.label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex-1 h-16 flex flex-col items-center justify-center gap-1 text-[11px] transition-colors ${
              isActive ? "text-paper-50 font-semibold" : "text-paper-50/50"
            }`}
          >
            <NavIcon name={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
