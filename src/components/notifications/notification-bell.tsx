import Link from "next/link";
import { getUnreadNotificationCount } from "@/lib/notifications/queries";

// Deliberately plain text, not an icon - nothing else in this app's nav
// uses icons (bottom-nav.tsx is text-label only), so a bell glyph here
// would be the one inconsistent element on the page.
export async function NotificationBell({ href }: { href: string }) {
  const unreadCount = await getUnreadNotificationCount();

  return (
    <Link
      href={href}
      className="fixed top-0 right-0 z-10 m-3 h-9 px-3 rounded-full bg-ink-900 border border-paper-50/15 flex items-center text-sm text-paper-50"
    >
      Notifiche{unreadCount > 0 ? ` (${unreadCount})` : ""}
    </Link>
  );
}
