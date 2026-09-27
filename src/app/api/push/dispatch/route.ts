import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseRange } from "@/lib/availability/intervals";
import { summarize } from "@/lib/notifications/summary";
import { sendPushToProfile } from "@/lib/push/send";

// Called by the database (notifications insert trigger, via pg_net) with a
// shared secret - never by browsers. Turns one notification row into a push.
function authorized(request: Request): boolean {
  const expected = `Bearer ${process.env.PUSH_DISPATCH_SECRET ?? ""}`;
  const got = request.headers.get("authorization") ?? "";
  return (
    !!process.env.PUSH_DISPATCH_SECRET &&
    got.length === expected.length &&
    timingSafeEqual(Buffer.from(got), Buffer.from(expected))
  );
}

export async function POST(request: Request) {
  if (!authorized(request)) return new NextResponse("Unauthorized", { status: 401 });

  const { notificationId } = (await request.json().catch(() => ({}))) as { notificationId?: string };
  if (!notificationId) return new NextResponse("Bad request", { status: 400 });

  const admin = createAdminClient();
  const { data: n } = await admin
    .from("notifications")
    .select(
      "recipient_profile_id, notification_events(type, appointment_id, organizations(timezone), appointments(during, customer_profile_id, hairdressers(display_name), services(name), profiles!appointments_customer_profile_id_fkey(full_name)))",
    )
    .eq("id", notificationId)
    .maybeSingle();
  if (!n) return new NextResponse("Not found", { status: 404 });

  const event = Array.isArray(n.notification_events) ? n.notification_events[0] : n.notification_events;
  const org = event && (Array.isArray(event.organizations) ? event.organizations[0] : event.organizations);
  const appt = event && (Array.isArray(event.appointments) ? event.appointments[0] : event.appointments);
  const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

  const isCustomer = appt?.customer_profile_id === n.recipient_profile_id;
  const basePath = isCustomer ? "/app" : "/hairdresser";
  let body = summarize(
    {
      event_type: event?.type ?? null,
      hairdresser_name: one(appt?.hairdressers)?.display_name ?? null,
      service_name: one(appt?.services)?.name ?? null,
      customer_name: one(appt?.profiles)?.full_name ?? null,
    },
    basePath,
  );
  if (appt?.during && org?.timezone) {
    const start = DateTime.fromMillis(parseRange(appt.during as string).start, { zone: "utc" }).setZone(org.timezone);
    body += ` - ${start.setLocale("it").toFormat("cccc d LLLL, HH:mm")}`;
  }

  const sent = await sendPushToProfile(n.recipient_profile_id, {
    title: "American Barber Tattoo",
    body,
    // A message opens its chat directly; everything else the notification list.
    url:
      event?.type === "message_received" && event.appointment_id
        ? `${basePath}/appointments/${event.appointment_id}/messages`
        : `${basePath}/notifications`,
  });
  return NextResponse.json({ sent });
}
