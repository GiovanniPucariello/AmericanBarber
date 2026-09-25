import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { parseRange } from "@/lib/availability/intervals";

// section 57: a brief, satisfying confirmation moment - not just a silent
// redirect straight into the appointments list.
export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ appointmentId?: string }>;
}) {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/app");

  const { appointmentId } = await searchParams;
  if (!appointmentId) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: appointment } = await supabase
    .from("appointments")
    .select("during, hairdressers(display_name), services(name)")
    .eq("id", appointmentId)
    .eq("customer_profile_id", user?.id ?? "")
    .maybeSingle();
  if (!appointment) notFound();

  const hairdresser = Array.isArray(appointment.hairdressers)
    ? appointment.hairdressers[0]
    : appointment.hairdressers;
  const service = Array.isArray(appointment.services) ? appointment.services[0] : appointment.services;
  const start = DateTime.fromMillis(parseRange(appointment.during as string).start, {
    zone: "utc",
  }).setZone(organization.timezone);

  return (
    <div className="p-6 flex flex-col items-center gap-6 text-center pt-16">
      <div className="animate-scale-in w-16 h-16 rounded-full bg-accent flex items-center justify-center text-2xl">
        ✓
      </div>
      <div>
        <h1 className="text-xl font-semibold">Appuntamento confermato</h1>
        <p className="text-paper-50/60 mt-1">{hairdresser?.display_name}</p>
      </div>
      <div className="rounded-md bg-ink-900 border border-paper-50/15 p-4 w-full max-w-xs">
        <p className="font-medium">{start.toFormat("cccc d LLLL")}</p>
        <p className="text-paper-50/70">{start.toFormat("HH:mm")}</p>
        <p className="text-paper-50/70 text-sm mt-1">{service?.name}</p>
      </div>
      <Link
        href="/app/appointments"
        className="h-12 px-8 rounded-md bg-accent text-paper-50 font-medium flex items-center justify-center transition-[background-color,transform] hover:bg-accent-hover active:scale-[0.98]"
      >
        Vedi l&apos;appuntamento
      </Link>
    </div>
  );
}
