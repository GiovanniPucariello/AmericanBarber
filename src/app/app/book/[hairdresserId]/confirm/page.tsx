import { notFound, redirect } from "next/navigation";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { ConfirmBookingForm } from "@/components/booking/confirm-booking-form";

export default async function ConfirmBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ hairdresserId: string }>;
  searchParams: Promise<{ serviceId?: string; start?: string }>;
}) {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/app");

  const { hairdresserId } = await params;
  const { serviceId, start } = await searchParams;
  if (!serviceId || !start) notFound();

  const supabase = await createClient();
  const [{ data: hairdresser }, { data: service }] = await Promise.all([
    supabase
      .from("hairdressers")
      .select("display_name")
      .eq("id", hairdresserId)
      .eq("organization_id", organization.id)
      .maybeSingle(),
    supabase
      .from("services")
      .select("name, duration_minutes")
      .eq("id", serviceId)
      .eq("organization_id", organization.id)
      .maybeSingle(),
  ]);
  if (!hairdresser || !service) notFound();

  const startLocal = DateTime.fromISO(start, { zone: "utc" }).setZone(organization.timezone);
  const endLocal = startLocal.plus({ minutes: service.duration_minutes });

  return (
    <div className="p-6 flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Conferma la prenotazione</h1>
      <div className="rounded-md bg-ink-900 border border-paper-50/15 p-4 flex flex-col gap-1">
        <p className="text-2xl font-semibold">{startLocal.toFormat("HH:mm")}</p>
        <p className="text-paper-50/70">
          {startLocal.toFormat("cccc d LLLL")} - {endLocal.toFormat("HH:mm")}
        </p>
        <div className="h-px bg-paper-50/10 my-2" />
        <p>{hairdresser.display_name}</p>
        <p className="text-paper-50/70 text-sm">{service.name}</p>
      </div>
      <ConfirmBookingForm hairdresserId={hairdresserId} serviceId={serviceId} startUtc={start} />
    </div>
  );
}
