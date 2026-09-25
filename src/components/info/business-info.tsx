const ADDRESS = "Viale Giuseppe la Torre, 304, 71122 Foggia FG";
const PHONE_DISPLAY = "351 913 1549";
const PHONE_TEL = "+393519131549";
const MAPS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ADDRESS)}`;

const HOURS: { day: string; hours: string }[] = [
  { day: "Lunedì", hours: "08–22" },
  { day: "Martedì", hours: "08–22" },
  { day: "Mercoledì", hours: "08–22" },
  { day: "Giovedì", hours: "08–22" },
  { day: "Venerdì", hours: "08–22" },
  { day: "Sabato", hours: "08–19" },
  { day: "Domenica", hours: "Chiuso" },
];

// Single-location shop (DESIGN.md section 20 - "one today, N in the future"),
// so this is hardcoded rather than modeled in the database - upgrade to a
// real settings-backed field if a second location or admin editing is ever
// needed, not before.
export function BusinessInfo() {
  return (
    <div className="flex flex-col gap-3">
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
        <p className="text-paper-50/60 text-sm mb-1">Orari</p>
        <ul className="flex flex-col gap-0.5">
          {HOURS.map((row) => (
            <li key={row.day} className="flex items-center justify-between text-sm">
              <span className="text-paper-50/80">{row.day}</span>
              <span className={row.hours === "Chiuso" ? "text-paper-50/40" : ""}>{row.hours}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
