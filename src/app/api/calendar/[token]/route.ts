import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildHairdresserIcs } from "@/lib/calendar/hairdresser-feed";

// Subscribed calendar feed ("Sincronizza calendario"). Calendar apps poll it
// without a login, so the unguessable token in the URL is the credential;
// it maps to exactly one barber's agenda. Accepts "<token>" or "<token>.ics".
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token.replace(/\.ics$/, "");
  if (!/^[0-9a-f-]{36}$/i.test(token)) return new NextResponse("Not found", { status: 404 });

  const admin = createAdminClient();
  const { data: feed } = await admin
    .from("calendar_feeds")
    .select("hairdressers!inner(id, organizations!inner(timezone))")
    .eq("token", token)
    .maybeSingle();
  const hairdresser = feed && (Array.isArray(feed.hairdressers) ? feed.hairdressers[0] : feed.hairdressers);
  if (!hairdresser) return new NextResponse("Not found", { status: 404 });
  const org = Array.isArray(hairdresser.organizations) ? hairdresser.organizations[0] : hairdresser.organizations;

  const ics = await buildHairdresserIcs(admin, hairdresser.id, org?.timezone ?? "Europe/Rome", {
    pastDays: 30,
    futureDays: 180,
  });
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
