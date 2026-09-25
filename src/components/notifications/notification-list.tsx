import Link from "next/link";
import { DateTime } from "luxon";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications/actions";
import { parseRange } from "@/lib/availability/intervals";
import type { Database } from "@/types/database";

type NotificationRow = Database["public"]["Views"]["notification_feed"]["Row"];

function summarize(n: NotificationRow, basePath: "/app" | "/hairdresser"): string {
  switch (n.event_type) {
    case "booking_confirmed":
      return `Nuova prenotazione - ${n.service_name ?? "un servizio"} con ${n.customer_name ?? "un cliente"}`;
    case "booking_cancelled":
      return `Annullata - ${n.service_name ?? "un servizio"} con ${n.customer_name ?? "un cliente"}`;
    case "recurring_request_created":
      return `Nuova richiesta ricorrente da ${n.customer_name ?? "un cliente"} per ${n.service_name ?? "un servizio"}`;
    case "recurring_request_approved":
      return `La tua prenotazione ricorrente per ${n.service_name ?? "un servizio"} con ${n.hairdresser_name ?? "il tuo barbiere"} è stata approvata`;
    case "recurring_request_rejected":
      return `La tua richiesta di prenotazione ricorrente per ${n.service_name ?? "un servizio"} con ${n.hairdresser_name ?? "il tuo barbiere"} è stata rifiutata`;
    case "message_received":
      return basePath === "/app"
        ? `Nuovo messaggio da ${n.hairdresser_name ?? "il tuo barbiere"}`
        : `Nuovo messaggio da ${n.customer_name ?? "un cliente"}`;
    default:
      return n.event_type ?? "Notifica";
  }
}

export function NotificationList({
  notifications,
  timezone,
  basePath,
}: {
  notifications: NotificationRow[];
  timezone: string;
  basePath: "/app" | "/hairdresser";
}) {
  const unreadCount = notifications.filter((n) => n.status !== "read").length;

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Notifiche</h1>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <button type="submit" className="text-sm underline underline-offset-2">
              Segna tutte come lette
            </button>
          </form>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {notifications.map((n) => {
          const unread = n.status !== "read";
          const when = n.during ? parseRange(n.during as unknown as string).start : null;

          return (
            <li
              key={n.notification_id}
              className={`rounded-md border p-4 flex items-start justify-between gap-3 ${
                unread ? "border-accent/50 bg-ink-900" : "border-paper-50/15 bg-ink-900"
              }`}
            >
              <div>
                {n.event_type === "message_received" && n.appointment_id ? (
                  <Link
                    href={`${basePath}/appointments/${n.appointment_id}/messages`}
                    className={`underline underline-offset-2 ${unread ? "font-medium" : "text-paper-50/70"}`}
                  >
                    {summarize(n, basePath)}
                  </Link>
                ) : (
                  <p className={unread ? "font-medium" : "text-paper-50/70"}>{summarize(n, basePath)}</p>
                )}
                <p className="text-paper-50/40 text-sm mt-1">
                  {when
                    ? DateTime.fromMillis(when, { zone: "utc" }).setZone(timezone).toFormat("d LLL, HH:mm")
                    : DateTime.fromISO(n.created_at ?? "").setZone(timezone).toFormat("d LLL, HH:mm")}
                </p>
              </div>
              {unread && (
                <form action={markNotificationRead.bind(null, n.notification_id as string)}>
                  <button type="submit" className="text-sm underline underline-offset-2 shrink-0">
                    Segna come letta
                  </button>
                </form>
              )}
            </li>
          );
        })}
        {notifications.length === 0 && <p className="text-paper-50/60">Nessuna notifica per ora.</p>}
      </ul>
    </div>
  );
}
