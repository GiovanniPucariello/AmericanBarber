import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { computeDaySchedule } from "@/lib/availability/compute";
import { DateCarousel } from "@/components/booking/date-carousel";
import { TimeSlotGrid } from "@/components/booking/time-slot-grid";

export default async function ChooseServiceAndTimePage({
  params,
  searchParams,
}: {
  params: Promise<{ hairdresserId: string }>;
  searchParams: Promise<{ serviceId?: string; date?: string }>;
}) {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/app");

  const { hairdresserId } = await params;
  const supabase = await createClient();

  const { data: hairdresser } = await supabase
    .from("hairdressers")
    .select("id, display_name, avatar_url")
    .eq("id", hairdresserId)
    .eq("organization_id", organization.id)
    .eq("active", true)
    .maybeSingle();
  if (!hairdresser) notFound();

  const { data: offeredServices } = await supabase
    .from("hairdresser_services")
    .select("services!inner(id, name, duration_minutes)")
    .eq("hairdresser_id", hairdresserId);

  const services = (offeredServices ?? [])
    .map((row) => (Array.isArray(row.services) ? row.services[0] : row.services))
    .filter((s): s is { id: string; name: string; duration_minutes: number } => !!s);

  if (services.length === 0) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <div className="rounded-md bg-ink-900 border border-paper-50/15 border-dashed p-6 flex flex-col items-center gap-3 text-center">
          <p className="text-paper-50/70">
            {hairdresser.display_name} non offre ancora servizi prenotabili.
          </p>
          <Link
            href="/app/book"
            className="h-11 px-6 rounded-md bg-accent text-paper-50 font-medium flex items-center justify-center transition-[background-color,transform] hover:bg-accent-hover active:scale-[0.98]"
          >
            Scegli un altro barbiere
          </Link>
        </div>
      </div>
    );
  }

  const { serviceId: requestedServiceId, date: requestedDate } = await searchParams;
  const service = services.find((s) => s.id === requestedServiceId) ?? services[0];
  const today = DateTime.now().setZone(organization.timezone).toISODate();
  const date = requestedDate ?? today ?? "2026-01-01";

  const slots = await computeDaySchedule(supabase, {
    hairdresserId,
    date,
    timeZone: organization.timezone,
    serviceDurationMinutes: service.duration_minutes,
    bookingIntervalMinutes: organization.bookingIntervalMinutes,
  });

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {hairdresser.avatar_url ? (
          <Image
            src={hairdresser.avatar_url}
            alt={hairdresser.display_name}
            width={48}
            height={48}
            sizes="48px"
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-ink-900 flex items-center justify-center text-sm font-semibold uppercase">
            {hairdresser.display_name.slice(0, 1)}
          </div>
        )}
        <h1 className="text-lg font-semibold">{hairdresser.display_name}</h1>
      </div>

      <Link
        href={`/app/book/${hairdresserId}/recurring`}
        className="rounded-md bg-ink-900 border border-paper-50/15 p-3 flex items-center gap-3 hover:border-accent transition-[border-color,transform] active:scale-[0.98]"
      >
        <span className="w-10 h-10 shrink-0 rounded-full bg-accent/15 text-accent flex items-center justify-center text-lg">
          ↻
        </span>
        <span>
          <span className="block text-sm font-medium">Prenotazione ricorrente</span>
          <span className="block text-xs text-paper-50/60">Stesso giorno e orario ogni settimana</span>
        </span>
      </Link>

      <div className="flex flex-wrap gap-2">
        {services.map((s) => (
          <Link
            key={s.id}
            href={`?serviceId=${s.id}&date=${date}`}
            className={`h-10 px-3 rounded-md border flex items-center text-sm ${
              s.id === service.id
                ? "border-accent bg-accent text-paper-50"
                : "bg-ink-900 border-paper-50/15"
            }`}
          >
            {s.name} ({s.duration_minutes}min)
          </Link>
        ))}
      </div>

      <DateCarousel timeZone={organization.timezone} selectedDate={date} serviceId={service.id} />

      <TimeSlotGrid
        slots={slots}
        timeZone={organization.timezone}
        hairdresserId={hairdresserId}
        serviceId={service.id}
        dateKey={date}
        dateLabel={DateTime.fromISO(date, { zone: organization.timezone }).toFormat("cccc d LLLL")}
      />
    </div>
  );
}
