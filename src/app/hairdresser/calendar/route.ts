import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { getCurrentHairdresser } from "@/lib/hairdressers/queries";
import { parseRange } from "@/lib/availability/intervals";
import { buildIcsCalendar } from "@/lib/calendar/ics";

// "Aggiungi tutti al calendario": the barber's next 60 days as one .ics.
// Same UIDs as the customer export, so re-importing updates, not duplicates.
export async function GET() {
  const organization = await getCurrentOrganization();
  const hairdresser = organization ? await getCurrentHairdresser(organization.id) : null;
  if (!organization || !hairdresser) return new NextResponse("Non autorizzato", { status: 401 });

  const supabase = await createClient();
  const from = DateTime.now().setZone(organization.timezone).startOf("day");
  const range = `[${from.toISO()},${from.plus({ days: 60 }).toISO()})`;
  const { data: rows } = await supabase
    .from("appointments")
    .select("id, during, customer_profile_id, services(name)")
    .eq("hairdresser_id", hairdresser.id)
    .in("status", ["pending", "confirmed"])
    .overlaps("during", range);

  const ids = [...new Set((rows ?? []).map((r) => r.customer_profile_id))];
  const { data: customers } = ids.length
    ? await supabase.from("co_member_profiles").select("id, full_name, phone").in("id", ids)
    : { data: [] };
  const byId = new Map((customers ?? []).map((c) => [c.id, c]));

  const ics = buildIcsCalendar(
    (rows ?? []).map((r) => {
      const { start, end } = parseRange(r.during as string);
      const service = Array.isArray(r.services) ? r.services[0] : r.services;
      const customer = byId.get(r.customer_profile_id);
      return {
        uid: `${r.id}@american-barber-tattoo`,
        start,
        end,
        summary: `${service?.name ?? "Appuntamento"} - ${customer?.full_name ?? "Cliente"}`,
        description: customer?.phone ? `Tel. ${customer.phone}` : undefined,
      };
    }),
  );

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="agenda.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
