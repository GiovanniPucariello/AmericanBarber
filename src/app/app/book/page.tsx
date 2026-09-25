import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";

// Large, easily-tappable cards (section 37) - one decision, big touch
// targets, no dense list rows.
export default async function BookHairdresserPage() {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/app");

  const supabase = await createClient();
  const { data: hairdressers } = await supabase
    .from("hairdressers")
    .select("id, display_name, avatar_url")
    .eq("organization_id", organization.id)
    .eq("active", true)
    .order("sort_order");

  return (
    <div className="p-6 flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Scegli un barbiere</h1>
      <div className="grid grid-cols-2 gap-3">
        {hairdressers?.map((h) => (
          <Link
            key={h.id}
            href={`/app/book/${h.id}`}
            className="rounded-md bg-ink-900 border border-paper-50/15 p-4 flex flex-col items-center gap-3 hover:border-accent transition-[border-color,transform] active:scale-[0.97]"
          >
            {h.avatar_url ? (
              <Image
                src={h.avatar_url}
                alt={h.display_name}
                width={112}
                height={112}
                sizes="112px"
                className="w-28 h-28 rounded-full object-cover"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-ink-900 flex items-center justify-center text-2xl font-semibold uppercase">
                {h.display_name.slice(0, 1)}
              </div>
            )}
            <p className="text-center">{h.display_name}</p>
          </Link>
        ))}
        {hairdressers?.length === 0 && (
          <div className="col-span-2 rounded-md bg-ink-900 border border-paper-50/15 border-dashed p-6 flex flex-col items-center gap-3 text-center">
            <p className="text-paper-50/60">
              Nessun barbiere disponibile al momento - torna a trovarci presto.
            </p>
            <Link href="/app" className="text-sm underline underline-offset-2">
              Torna alla home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
