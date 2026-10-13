import { createAdminClient } from "@/lib/supabase/admin";
import { shopHours } from "@/lib/availability/shop-hours";

export const ADDRESS = "Viale Giuseppe la Torre, 304, 71122 Foggia FG";
const PHONE_DISPLAY = "351 913 1549";
const PHONE_TEL = "+393519131549";
const INSTAGRAM = "americanbarbertattoofoggia";
const MAPS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ADDRESS)}`;

// Single-location shop (DESIGN.md section 20 - "one today, N in the future"),
// so address/phone are hardcoded. Hours come from the barbers' weekly
// availability rules, so a barber editing their schedule updates them here.
export async function BusinessInfo({ organizationId }: { organizationId: string | undefined }) {
  // availability_rules is members-only under RLS; the service-role read is
  // limited to the times of active barbers' active rules.
  const { data: rules } = organizationId
    ? await createAdminClient()
        .from("availability_rules")
        .select("weekday, start_time, end_time, hairdressers!inner(active)")
        .eq("organization_id", organizationId)
        .eq("active", true)
        .eq("hairdressers.active", true)
    : { data: [] };
  const hours = shopHours(rules ?? []);

  return (
    <div className="grid gap-5 sm:grid-cols-2 sm:gap-10">
      <div className="flex flex-col gap-5">
      <div>
        <p className="text-paper-50/60 text-sm">Indirizzo</p>
        <p>{ADDRESS}</p>
        <a
          href={MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm underline underline-offset-2 text-paper-50/80"
        >
          Indicazioni
        </a>
      </div>

      <div>
        <p className="text-paper-50/60 text-sm">Telefono</p>
        <a href={`tel:${PHONE_TEL}`} className="underline underline-offset-2">
          {PHONE_DISPLAY}
        </a>
      </div>

      <div>
        <p className="text-paper-50/60 text-sm">Instagram</p>
        <a
          href={`https://instagram.com/${INSTAGRAM}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          @{INSTAGRAM}
        </a>
      </div>
      </div>

      <div>
        <p className="text-paper-50/60 text-sm mb-1">Orari</p>
        <ul className="flex flex-col divide-y divide-paper-50/10">
          {hours.map((row) => (
            <li key={row.day} className="flex items-center justify-between text-sm py-1.5 tabular-nums">
              <span className="text-paper-50/80">{row.day}</span>
              <span className={row.hours === "Chiuso" ? "text-paper-50/40" : ""}>{row.hours}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
