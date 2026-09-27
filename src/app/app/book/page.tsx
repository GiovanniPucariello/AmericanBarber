import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DateTime } from "luxon";
import "@fontsource/pirata-one/400.css";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { getPreferredHairdresserId } from "@/lib/preferences/queries";
import { findFirstAvailableDay } from "@/lib/availability/compute";
import { relativeDayLabel } from "@/lib/calendar/relative-day";

type Barber = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  instagram_handle: string | null;
  nextSlot: { label: string; time: string } | null;
};

// Picking a barber is a person choice, not a list pick (section 37): big
// portraits, each barber's real next free slot, the customer's own barber
// pinned first.
export default async function BookHairdresserPage() {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/app");

  const supabase = await createClient();
  const [{ data: hairdressers }, { data: firstService }, preferredId] = await Promise.all([
    supabase
      .from("hairdressers")
      .select("id, display_name, avatar_url, instagram_handle")
      .eq("organization_id", organization.id)
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("services")
      .select("duration_minutes")
      .eq("organization_id", organization.id)
      .eq("active", true)
      .order("sort_order")
      .limit(1)
      .maybeSingle(),
    getPreferredHairdresserId(organization.id),
  ]);

  const tz = organization.timezone;
  const today = DateTime.now().setZone(tz).startOf("day");

  // One lookup per barber, in parallel. Uses the first service's duration
  // as the reference ("Taglio") - the barber page recomputes per service.
  const barbers: Barber[] = await Promise.all(
    (hairdressers ?? []).map(async (h) => {
      const free = firstService
        ? await findFirstAvailableDay(supabase, {
            hairdresserId: h.id,
            timeZone: tz,
            serviceDurationMinutes: firstService.duration_minutes,
            bookingIntervalMinutes: organization.bookingIntervalMinutes,
            fromDate: today.toISODate() as string,
            days: 7,
          })
        : null;
      const slot = free?.slots.find((s) => s.available);
      const start = slot ? DateTime.fromISO(slot.startUtc, { zone: "utc" }).setZone(tz) : null;
      return {
        ...h,
        nextSlot: start ? { label: relativeDayLabel(start, today), time: start.toFormat("HH:mm") } : null,
      };
    }),
  );

  const preferred = barbers.find((b) => b.id === preferredId) ?? null;
  const others = barbers.filter((b) => b.id !== preferred?.id);

  return (
    <div className="p-6 flex flex-col gap-5">
      <h1 className="text-xl font-semibold">Scegli il tuo barbiere</h1>

      {preferred && (
        <div className="rounded-lg bg-ink-900 border border-accent overflow-hidden">
          <Link
            href={`/app/book/${preferred.id}`}
            className="flex gap-4 p-3 active:scale-[0.99] transition-transform"
          >
            <Portrait barber={preferred} className="w-28 shrink-0 rounded-md" sizes="112px" />
            <div className="flex flex-col justify-center min-w-0 gap-1">
              <span className="self-start h-6 px-2 rounded-full bg-accent text-paper-50 text-xs font-medium flex items-center">
                Il tuo barbiere
              </span>
              <p className="font-display text-4xl leading-none">{preferred.display_name}</p>
              <NextSlot slot={preferred.nextSlot} />
              <span className="mt-1 text-sm font-semibold underline underline-offset-2">
                Prenota con {preferred.display_name}
              </span>
            </div>
          </Link>
          <InstagramLink handle={preferred.instagram_handle} className="px-3 pb-3" />
        </div>
      )}

      {preferred && others.length > 0 && <h2 className="text-sm text-paper-50/60 -mb-2">Oppure scegli un altro</h2>}

      <ul className="grid grid-cols-2 gap-3">
        {others.map((b) => (
          <li key={b.id} className="rounded-lg bg-ink-900 border border-paper-50/15 overflow-hidden flex flex-col">
            <Link
              href={`/app/book/${b.id}`}
              className="flex flex-col active:scale-[0.98] transition-transform hover:border-accent"
            >
              <div className="relative">
                <Portrait barber={b} className="w-full" sizes="(min-width: 640px) 300px, 45vw" />
                <p className="absolute inset-x-0 bottom-0 px-3 pt-8 pb-2 bg-gradient-to-t from-ink-950 via-ink-950/80 to-transparent font-display text-3xl leading-none">
                  {b.display_name}
                </p>
              </div>
              <div className="px-3 pt-2">
                <NextSlot slot={b.nextSlot} />
              </div>
            </Link>
            <InstagramLink handle={b.instagram_handle} className="px-3 pb-2" />
            {!b.instagram_handle && <span className="pb-2" />}
          </li>
        ))}
      </ul>

      {barbers.length === 0 && (
        <div className="rounded-md bg-ink-900 border border-paper-50/15 border-dashed p-6 flex flex-col items-center gap-3 text-center">
          <p className="text-paper-50/60">Nessun barbiere disponibile al momento - torna a trovarci presto.</p>
          <Link href="/app" className="text-sm underline underline-offset-2">
            Torna alla home
          </Link>
        </div>
      )}
    </div>
  );
}

function Portrait({ barber, className, sizes }: { barber: Barber; className: string; sizes: string }) {
  return barber.avatar_url ? (
    <Image
      src={barber.avatar_url}
      alt=""
      width={400}
      height={500}
      sizes={sizes}
      className={`${className} h-auto aspect-[4/5] object-cover`}
    />
  ) : (
    <div className={`${className} aspect-[4/5] bg-ink-800 flex items-center justify-center text-4xl font-semibold uppercase`}>
      {barber.display_name.slice(0, 1)}
    </div>
  );
}

function NextSlot({ slot }: { slot: Barber["nextSlot"] }) {
  if (!slot) return <p className="text-sm text-paper-50/50">Nessun posto nei prossimi 7 giorni</p>;
  return (
    <p className="text-sm text-paper-50/70">
      Libero {slot.label === "Oggi" || slot.label === "Domani" ? slot.label.toLowerCase() : slot.label} alle{" "}
      <span className="text-paper-50 font-semibold tabular-nums">{slot.time}</span>
    </p>
  );
}

function InstagramLink({ handle, className }: { handle: string | null; className: string }) {
  if (!handle) return null;
  return (
    <a
      href={`https://instagram.com/${handle}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} block py-1.5 text-xs text-paper-50/60 underline underline-offset-2 truncate`}
    >
      I suoi lavori su Instagram
    </a>
  );
}
