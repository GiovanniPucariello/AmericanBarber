import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { getCurrentHairdresser } from "@/lib/hairdressers/queries";

export default async function HairdresserProfilePage() {
  const organization = await getCurrentOrganization();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hairdresser = organization ? await getCurrentHairdresser(organization.id) : null;

  return (
    <div className="p-6 flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Profilo</h1>
      <div className="rounded-md bg-ink-900 border border-paper-50/15 p-4 flex flex-col gap-1">
        <p>{hairdresser?.displayName ?? "—"}</p>
        <p className="text-paper-50/60 text-sm">{user?.email}</p>
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
