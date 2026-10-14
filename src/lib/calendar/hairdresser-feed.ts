import type { SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import type { Database } from "@/types/database";
import { parseRange } from "@/lib/availability/intervals";
import { buildIcsCalendar } from "./ics";

// A barber's agenda as one .ics: the one-off download and the subscribed
// feed share it. Same UIDs as the customer export, so re-importing updates
// rather than duplicates.
export async function buildHairdresserIcs(
  supabase: SupabaseClient<Database>,
  hairdresserId: string,
  timeZone: string,
  { pastDays = 0, futureDays = 60 }: { pastDays?: number; futureDays?: number } = {},
): Promise<string> {
  const today = DateTime.now().setZone(timeZone).startOf("day");
  const range = `[${today.minus({ days: pastDays }).toISO()},${today.plus({ days: futureDays }).toISO()})`;
  const { data: rows } = await supabase
    .from("appointments")
    .select("id, during, customer_profile_id, guest_name, services(name)")
    .eq("hairdresser_id", hairdresserId)
    .in("status", ["pending", "confirmed"])
    .overlaps("during", range);

  const ids = [...new Set((rows ?? []).map((r) => r.customer_profile_id).filter((id): id is string => !!id))];
  const { data: customers } = ids.length
    ? await supabase.from("profiles").select("id, full_name, phone").in("id", ids)
    : { data: [] };
  const byId = new Map((customers ?? []).map((c) => [c.id, c]));

  return buildIcsCalendar(
    (rows ?? []).map((r) => {
      const { start, end } = parseRange(r.during as string);
      const service = Array.isArray(r.services) ? r.services[0] : r.services;
      const customer = r.customer_profile_id ? byId.get(r.customer_profile_id) : undefined;
      return {
        uid: `${r.id}@american-barber-tattoo`,
        start,
        end,
        summary: `${service?.name ?? "Appuntamento"} - ${customer?.full_name ?? r.guest_name ?? "Cliente"}`,
        description: customer?.phone ? `Tel. ${customer.phone}` : undefined,
      };
    }),
  );
}
