import type { Database } from "@/types/database";

// Shared by the in-app list and the web push sender so both say the same.
export type NotificationSummaryInput = {
  event_type: Database["public"]["Enums"]["notification_event_type"] | null;
  hairdresser_name: string | null;
  service_name: string | null;
  customer_name: string | null;
};

export function summarize(n: NotificationSummaryInput, basePath: "/app" | "/hairdresser"): string {
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
    case "waitlist_slot_freed":
      return `Si è liberato un posto con ${n.hairdresser_name ?? "il tuo barbiere"} - prenota prima che lo prenda qualcun altro`;
    case "booking_cancelled_by_hairdresser":
      return `${n.hairdresser_name ?? "Il barbiere"} ha annullato il tuo appuntamento - prenotane un altro quando vuoi`;
    case "schedule_changed":
      return `${n.hairdresser_name ?? "Il tuo barbiere"} ha spostato il tuo appuntamento di ${n.service_name ?? "servizio"}`;
    case "reminder_24h":
      return `Promemoria: domani ${n.service_name ?? "appuntamento"} con ${n.hairdresser_name ?? "il tuo barbiere"}`;
    default:
      return n.event_type ?? "Notifica";
  }
}
