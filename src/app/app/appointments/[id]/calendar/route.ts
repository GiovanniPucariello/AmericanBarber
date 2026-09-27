import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { parseRange } from "@/lib/availability/intervals";
import { buildIcs } from "@/lib/calendar/ics";
import { ADDRESS } from "@/components/info/business-info";

// "Aggiungi al calendario": serves the appointment as an .ics file, which
// iOS and Android both hand straight to the phone's calendar app.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Non autorizzato", { status: 401 });

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, during, status, hairdressers(display_name), services(name)")
    .eq("id", id)
    .eq("customer_profile_id", user.id)
    .maybeSingle();
  if (!appointment || appointment.status === "cancelled" || appointment.status === "rejected") {
    return new NextResponse("Appuntamento non trovato", { status: 404 });
  }

  const organization = await getCurrentOrganization();
  const hairdresser = Array.isArray(appointment.hairdressers)
    ? appointment.hairdressers[0]
    : appointment.hairdressers;
  const service = Array.isArray(appointment.services) ? appointment.services[0] : appointment.services;
  const { start, end } = parseRange(appointment.during as string);
  const shopName = organization?.name ?? "American Barber Tattoo";

  const ics = buildIcs({
    uid: `${appointment.id}@american-barber-tattoo`,
    start,
    end,
    summary: `${service?.name ?? "Appuntamento"} - ${shopName}`,
    description: hairdresser ? `Con ${hairdresser.display_name}` : undefined,
    location: ADDRESS,
    reminderMinutes: 60,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="appuntamento.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
