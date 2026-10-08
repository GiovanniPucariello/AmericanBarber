import Link from "next/link";
import { getUnreadNotificationCount } from "@/lib/notifications/queries";
import { NavIcon } from "@/components/layout/nav-icon";

export async function NotificationBell({ href }: { href: string }) {
  const unreadCount = await getUnreadNotificationCount();

  return (
    <Link
      href={href}
      aria-label={unreadCount > 0 ? `Notifiche, ${unreadCount} non lette` : "Notifiche"}
      className="relative w-11 h-11 rounded-full flex items-center justify-center text-paper-50/80 hover:text-paper-50 active:scale-[0.94] transition-transform"
    >
      <NavIcon name="bell" />
      {unreadCount > 0 && (
        <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-paper-50 text-[11px] font-semibold leading-[18px] text-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
