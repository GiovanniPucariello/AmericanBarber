import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";
import { BusinessInfo } from "@/components/info/business-info";
import Image from "next/image";
import { ProfileForm } from "@/components/profile/profile-form";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { getPreferredHairdresserId } from "@/lib/preferences/queries";
import { setPreferredHairdresser } from "@/lib/preferences/actions";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const organization = await getCurrentOrganization();
  const [{ data: hairdressers }, preferredId] = organization
    ? await Promise.all([
        supabase
          .from("hairdressers")
          .select("id, display_name, avatar_url")
          .eq("organization_id", organization.id)
          .eq("active", true)
          .order("sort_order"),
        getPreferredHairdresserId(organization.id),
      ])
    : [{ data: [] }, null];

  return (
    <div className="p-6 flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Profilo</h1>
        <p className="text-paper-50/60 text-sm">{user?.email}</p>
      </div>

      <section className="rounded-lg bg-ink-900 border border-paper-50/15 p-4">
        <ProfileForm fullName={profile?.full_name ?? ""} phone={profile?.phone ?? ""} />
      </section>

      <section className="rounded-lg bg-ink-900 border border-paper-50/15 p-4">
        <h2 className="font-semibold">Il mio barbiere</h2>
        <p className="text-sm text-paper-50/60 mb-3">
          Esce per primo quando prenoti e in &quot;Il solito?&quot; in home.
        </p>
        <form action={setPreferredHairdresser} className="flex flex-col gap-2">
          {(hairdressers ?? []).map((h) => {
            const selected = h.id === preferredId;
            return (
              <button
                key={h.id}
                type="submit"
                name="hairdresserId"
                value={h.id}
                aria-pressed={selected}
                className={`min-h-14 px-3 py-2 rounded-md border flex items-center gap-3 text-left active:scale-[0.99] transition-transform ${
                  selected ? "border-accent bg-accent/20" : "border-paper-50/15"
                }`}
              >
                {h.avatar_url ? (
                  <Image src={h.avatar_url} alt="" width={40} height={40} sizes="40px" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <span className="w-10 h-10 rounded-full bg-ink-800 flex items-center justify-center font-semibold uppercase">
                    {h.display_name.slice(0, 1)}
                  </span>
                )}
                <span className="flex-1 font-medium">{h.display_name}</span>
                <span aria-hidden className={selected ? "text-paper-50" : "text-paper-50/30"}>
                  {selected ? "★" : "☆"}
                </span>
              </button>
            );
          })}
          {preferredId && (
            <button type="submit" name="hairdresserId" value="" className="h-11 text-sm text-paper-50/70 underline underline-offset-2">
              Nessuna preferenza
            </button>
          )}
        </form>
      </section>

      <section className="rounded-lg bg-ink-900 border border-paper-50/15 p-4">
        <h2 className="font-semibold mb-3">Dove siamo</h2>
        <BusinessInfo />
      </section>

      <form action={signOut}>
        <button
          type="submit"
          className="h-12 w-full rounded-md border border-paper-50/15 text-sm font-medium text-paper-50/80 active:scale-[0.98] transition-transform"
        >
          Esci
        </button>
      </form>
    </div>
  );
}
