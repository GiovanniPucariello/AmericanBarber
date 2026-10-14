import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { getCurrentHairdresser } from "@/lib/hairdressers/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildHairdresserIcs } from "@/lib/calendar/hairdresser-feed";

// "Aggiungi al calendario": the barber's next 60 days as one .ics download.
// Service-role read (customer names live in profiles, own-row RLS) only
// after confirming the caller is this barber.
export async function GET() {
  const organization = await getCurrentOrganization();
  const hairdresser = organization ? await getCurrentHairdresser(organization.id) : null;
  if (!organization || !hairdresser) return new NextResponse("Non autorizzato", { status: 401 });

  const ics = await buildHairdresserIcs(createAdminClient(), hairdresser.id, organization.timezone);
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="agenda.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
