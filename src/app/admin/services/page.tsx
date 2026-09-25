import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/permissions/require-role";
import { setServiceActive } from "@/lib/services/actions";

export default async function ServicesPage() {
  const organization = await requireOrgRole("admin");
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price_cents, active, sort_order")
    .eq("organization_id", organization.id)
    .order("sort_order");

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Servizi</h1>
        <Link
          href="/admin/services/new"
          className="h-10 px-4 rounded-md bg-accent text-paper-50 flex items-center text-sm font-medium"
        >
          Aggiungi servizio
        </Link>
      </div>

      <ul className="flex flex-col gap-2">
        {services?.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-4 rounded-md bg-ink-900 border border-paper-50/15 p-4"
          >
            <div>
              <p className={s.active ? "" : "opacity-50"}>{s.name}</p>
              <p className="text-sm text-paper-50/60">
                {s.duration_minutes} min
                {s.price_cents != null ? ` - ${(s.price_cents / 100).toFixed(2)}` : ""}
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link
                href={`/admin/services/${s.id}/edit`}
                className="text-sm underline underline-offset-2"
              >
                Modifica
              </Link>
              <form action={setServiceActive.bind(null, s.id, !s.active)}>
                <button type="submit" className="text-sm underline underline-offset-2">
                  {s.active ? "Disattiva" : "Attiva"}
                </button>
              </form>
            </div>
          </li>
        ))}
        {services?.length === 0 && (
          <div className="rounded-md bg-ink-900 border border-paper-50/15 border-dashed p-6 flex flex-col items-center gap-3 text-center">
            <p className="text-paper-50/60">Nessun servizio ancora.</p>
            <Link
              href="/admin/services/new"
              className="h-11 px-6 rounded-md bg-accent text-paper-50 font-medium flex items-center justify-center transition-[background-color,transform] hover:bg-accent-hover active:scale-[0.98]"
            >
              Aggiungi servizio
            </Link>
          </div>
        )}
      </ul>
    </div>
  );
}
