import Link from "next/link";
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
      .select("name, duration_minutes, price_cents")
      .eq("id", serviceId)
      .eq("organization_id", organization.id)
      .maybeSingle(),
  ]);
  if (!hairdresser || !service) notFound();

  const startLocal = DateTime.fromISO(start, { zone: "utc" }).setZone(organization.timezone);
  const endLocal = startLocal.plus({ minutes: service.duration_minutes });

  const dateKey = startLocal.toISODate();

  return (
    <div className="p-6 flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Conferma la prenotazione</h1>
      <div className="rounded-lg bg-ink-900 border border-paper-50/15 border-l-4 border-l-accent p-4 flex flex-col gap-1">
        <p className="text-sm text-paper-50/70 capitalize">{startLocal.toFormat("cccc d LLLL")}</p>
        <p className="text-4xl font-semibold tabular-nums leading-tight">
          {startLocal.toFormat("HH:mm")}
          <span className="text-lg text-paper-50/50 font-normal"> – {endLocal.toFormat("HH:mm")}</span>
        </p>
        <div className="h-px bg-paper-50/10 my-3" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">{service.name}</p>
            <p className="text-paper-50/60 text-sm">
              con {hairdresser.display_name} · {service.duration_minutes} min
            </p>
          </div>
          {service.price_cents != null && (
            <p className="font-semibold tabular-nums shrink-0">
              €{(service.price_cents / 100).toFixed(2).replace(".", ",")}
            </p>
          )}
        </div>
      </div>
      <ConfirmBookingForm hairdresserId={hairdresserId} serviceId={serviceId} startUtc={start} />
      <Link
        href={`/app/book/${hairdresserId}?serviceId=${serviceId}&date=${dateKey}`}
        className="h-11 flex items-center justify-center text-sm text-paper-50/70 underline underline-offset-2"
      >
        Cambia orario
      </Link>
    </div>
  );
}
