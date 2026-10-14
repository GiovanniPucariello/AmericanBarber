import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { parseRange } from "@/lib/availability/intervals";
import { buildIcsCalendar } from "@/lib/calendar/ics";
import { ADDRESS } from "@/components/info/business-info";

// "Aggiungi tutta la serie al calendario": every upcoming confirmed date of a
// recurring booking in one .ics, same UIDs as the single-appointment export.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Non autorizzato", { status: 401 });

  const { data: rule } = await supabase
    .from("recurring_bookings")
    .select("id, hairdressers(display_name), services(name)")
    .eq("id", id)
    .eq("customer_profile_id", user.id)
    .maybeSingle();
  if (!rule) return new NextResponse("Serie non trovata", { status: 404 });

  const { data: occurrences } = await supabase
    .from("recurring_booking_occurrences")
    .select("appointments!inner(id, during, status)")
    .eq("recurring_booking_id", id)
    .eq("status", "confirmed");

  const organization = await getCurrentOrganization();
  const hairdresser = Array.isArray(rule.hairdressers) ? rule.hairdressers[0] : rule.hairdressers;
  const service = Array.isArray(rule.services) ? rule.services[0] : rule.services;
  const shopName = organization?.name ?? "American Barber Tattoo";
  const now = Date.now();

  const events = (occurrences ?? [])
    .map((o) => (Array.isArray(o.appointments) ? o.appointments[0] : o.appointments))
    .filter((a): a is NonNullable<typeof a> => !!a && a.status === "confirmed")
    .map((a) => ({ id: a.id, ...parseRange(a.during as string) }))
    .filter((a) => a.end > now)
    .map((a) => ({
      uid: `${a.id}@american-barber-tattoo`,
      start: a.start,
      end: a.end,
      summary: `${service?.name ?? "Appuntamento"} - ${shopName}`,
      description: hairdresser ? `Con ${hairdresser.display_name}` : undefined,
      location: ADDRESS,
      reminderMinutes: 60,
    }));

  return new NextResponse(buildIcsCalendar(events), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="serie-appuntamenti.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
