import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { computeDaySchedule, findFirstAvailableDay } from "@/lib/availability/compute";
import { DateCarousel } from "@/components/booking/date-carousel";
import { TimeSlotGrid } from "@/components/booking/time-slot-grid";
import { getPreferredHairdresserId } from "@/lib/preferences/queries";
import { togglePreferredHairdresser } from "@/lib/preferences/actions";
import { NavIcon } from "@/components/layout/nav-icon";

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
    .select("id, display_name, avatar_url, instagram_handle")
    .eq("id", hairdresserId)
    .eq("organization_id", organization.id)
    .eq("active", true)
    .maybeSingle();
  if (!hairdresser) notFound();

  const { data: offeredServices } = await supabase
    .from("hairdresser_services")
    .select("services!inner(id, name, duration_minutes, price_cents)")
    .eq("hairdresser_id", hairdresserId);

  const services = (offeredServices ?? [])
    .map((row) => (Array.isArray(row.services) ? row.services[0] : row.services))
    .filter(
      (s): s is { id: string; name: string; duration_minutes: number; price_cents: number | null } =>
        !!s,
    );

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
  const today = DateTime.now().setZone(organization.timezone).toISODate() as string;
  const scheduleParams = {
    hairdresserId,
    timeZone: organization.timezone,
    serviceDurationMinutes: service.duration_minutes,
    bookingIntervalMinutes: organization.bookingIntervalMinutes,
  };

  // No date picked yet: open on the first day with a free slot instead of
  // landing on "Chiuso" when today is Sunday or already full.
  const firstFree = requestedDate
    ? null
    : await findFirstAvailableDay(supabase, { ...scheduleParams, fromDate: today, days: 7 });
  const date = requestedDate ?? firstFree?.date ?? today;
  const slots = firstFree?.slots ?? (await computeDaySchedule(supabase, { ...scheduleParams, date }));

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [preferredId, { data: waitlistEntry }] = await Promise.all([
    getPreferredHairdresserId(organization.id),
    supabase
      .from("waitlist_entries")
      .select("id")
      .eq("customer_profile_id", user?.id ?? "")
      .eq("hairdresser_id", hairdresserId)
      .eq("date", date)
      .maybeSingle(),
  ]);
  const isPreferred = preferredId === hairdresserId;

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
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold">{hairdresser.display_name}</h1>
          {hairdresser.instagram_handle && (
            <a
              href={`https://instagram.com/${hairdresser.instagram_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-paper-50/60 underline underline-offset-2 truncate"
            >
              @{hairdresser.instagram_handle}
            </a>
          )}
        </div>
        <form action={togglePreferredHairdresser.bind(null, hairdresserId)}>
          <button
            type="submit"
            aria-pressed={isPreferred}
            className={`h-11 px-3 rounded-full border text-sm font-medium flex items-center gap-1.5 active:scale-[0.96] transition-transform ${
              isPreferred ? "bg-accent border-accent text-paper-50" : "border-paper-50/25 text-paper-50/80"
            }`}
          >
            <NavIcon name="star" className={`w-4 h-4 ${isPreferred ? "fill-current" : ""}`} />
            {isPreferred ? "Il mio barbiere" : "Imposta come mio"}
          </button>
        </form>
      </div>

      <Link
        href={`/app/book/${hairdresserId}/recurring`}
        className="rounded-md bg-ink-900 border border-paper-50/15 p-3 flex items-center gap-3 hover:border-accent transition-[border-color,transform] active:scale-[0.98]"
      >
        <span className="w-10 h-10 shrink-0 rounded-full bg-accent/25 text-paper-50 flex items-center justify-center">
          <NavIcon name="repeat" className="w-5 h-5" />
        </span>
        <span>
          <span className="block text-sm font-medium">Prenotazione ricorrente</span>
          <span className="block text-xs text-paper-50/60">Stesso giorno e orario ogni settimana</span>
        </span>
      </Link>

      <div className="flex gap-2 overflow-x-auto snap-x -mx-6 px-6 scroll-pl-6 no-scrollbar">
        {services.map((s) => (
          <Link
            key={s.id}
            href={`?serviceId=${s.id}&date=${date}`}
            replace
            scroll={false}
            aria-current={s.id === service.id ? "true" : undefined}
            className={`shrink-0 snap-start min-h-11 px-3 py-1.5 rounded-md border flex flex-col justify-center text-left ${
              s.id === service.id
                ? "border-accent bg-accent text-paper-50"
                : "bg-ink-900 border-paper-50/15"
            }`}
          >
            <span className="text-sm font-medium leading-tight">{s.name}</span>
            <span className={`text-xs ${s.id === service.id ? "text-paper-50/80" : "text-paper-50/50"}`}>
              {s.duration_minutes} min
              {s.price_cents != null && ` · €${(s.price_cents / 100).toFixed(2).replace(".", ",")}`}
            </span>
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
        onWaitlist={!!waitlistEntry}
      />
    </div>
  );
}
