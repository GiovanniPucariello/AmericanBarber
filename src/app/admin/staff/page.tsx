import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/permissions/require-role";
import { setHairdresserActive } from "@/lib/hairdressers/actions";

export default async function StaffPage() {
  const organization = await requireOrgRole("admin");
  const supabase = await createClient();
  const { data: hairdressers } = await supabase
    .from("hairdressers")
    .select("id, display_name, bio, active, sort_order, profile_id")
    .eq("organization_id", organization.id)
    .order("sort_order");

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Personale</h1>
        <Link
          href="/admin/staff/new"
          className="h-10 px-4 rounded-md bg-accent text-paper-50 flex items-center text-sm font-medium"
        >
          Aggiungi barbiere
        </Link>
      </div>

      <ul className="flex flex-col gap-2">
        {hairdressers?.map((h) => (
          <li
            key={h.id}
            className="flex items-center justify-between gap-4 rounded-md bg-ink-900 border border-paper-50/15 p-4"
          >
            <div>
              <p className={h.active ? "" : "opacity-50"}>{h.display_name}</p>
              {h.bio && <p className="text-sm text-paper-50/60">{h.bio}</p>}
              <p className="text-xs text-paper-50/40 mt-0.5">
                {h.profile_id ? "Accesso attivo" : "Nessun accesso"}
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link
                href={`/admin/staff/${h.id}/edit`}
                className="text-sm underline underline-offset-2"
              >
                Modifica
              </Link>
              <form action={setHairdresserActive.bind(null, h.id, !h.active)}>
                <button
                  type="submit"
                  className="text-sm underline underline-offset-2"
                >
                  {h.active ? "Disattiva" : "Attiva"}
                </button>
              </form>
            </div>
          </li>
        ))}
        {hairdressers?.length === 0 && (
          <div className="rounded-md bg-ink-900 border border-paper-50/15 border-dashed p-6 flex flex-col items-center gap-3 text-center">
            <p className="text-paper-50/60">Nessun barbiere ancora.</p>
            <Link
              href="/admin/staff/new"
              className="h-11 px-6 rounded-md bg-accent text-paper-50 font-medium flex items-center justify-center transition-[background-color,transform] hover:bg-accent-hover active:scale-[0.98]"
            >
              Aggiungi barbiere
            </Link>
          </div>
        )}
      </ul>
    </div>
  );
}
