const DAYS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

type Rule = { weekday: number; start_time: string; end_time: string };

// "08:00:00" -> "08", "08:20:00" -> "08:20" (the shop's usual "08–22" style).
const short = (t: string) => (t.slice(3, 5) === "00" ? t.slice(0, 2) : t.slice(0, 5));

// Shop hours per weekday (0 = Monday) = first barber in to last barber out,
// from the barbers' weekly availability rules. No rule that day = closed.
// shortcut: a gap between two barbers' shifts still shows as open, fine while
// shifts overlap - split into ranges if the shop ever closes mid-day.
export function shopHours(rules: Rule[]): { day: string; hours: string }[] {
  return DAYS.map((day, weekday) => {
    const today = rules.filter((r) => r.weekday === weekday);
    if (today.length === 0) return { day, hours: "Chiuso" };
    const open = today.map((r) => r.start_time).sort()[0];
    const close = today.map((r) => r.end_time).sort().at(-1)!;
    return { day, hours: `${short(open)}–${short(close)}` };
  });
}
