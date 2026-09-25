import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";
import { BusinessInfo } from "@/components/info/business-info";

// Minimal (name, email, sign out) - full profile editing is future work;
// this exists so the bottom nav's "Profilo" tab has a real destination.
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

  return (
    <div className="p-6 flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Profilo</h1>
      <div className="rounded-md bg-ink-900 border border-paper-50/15 p-4 flex flex-col gap-1">
        <p>{profile?.full_name ?? "—"}</p>
        <p className="text-paper-50/60 text-sm">{user?.email}</p>
        {profile?.phone && <p className="text-paper-50/60 text-sm">{profile.phone}</p>}
      </div>

      <div className="rounded-md bg-ink-900 border border-paper-50/15 p-4">
        <h2 className="font-semibold mb-3">Dove siamo</h2>
        <BusinessInfo />
      </div>

      <form action={signOut}>
        <button
          type="submit"
          className="h-12 px-4 rounded-md bg-ink-900 border border-paper-50/15 text-sm font-medium"
        >
          Esci
        </button>
      </form>
    </div>
  );
}
