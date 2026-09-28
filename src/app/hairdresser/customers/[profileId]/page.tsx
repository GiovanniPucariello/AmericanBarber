import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { getCurrentHairdresser } from "@/lib/hairdressers/queries";
import { parseRange } from "@/lib/availability/intervals";
import { deleteCustomerNote } from "@/lib/customer-notes/actions";
import { NoteForm } from "@/components/customer-notes/note-form";

// Customer card for staff: notes on how they like their cut, plus their
// recent visits with this barber. Customers never see this page or notes.
export default async function CustomerPage({ params }: { params: Promise<{ profileId: string }> }) {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/hairdresser");
  const hairdresser = await getCurrentHairdresser(organization.id);

  const { profileId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: customer }, { data: notes }, { data: visits }] = await Promise.all([
    supabase.from("co_member_profiles").select("id, full_name, phone").eq("id", profileId).maybeSingle(),
    supabase
      .from("customer_notes")
      .select("id, body, created_at, author_profile_id")
      .eq("organization_id", organization.id)
      .eq("customer_profile_id", profileId)
      .order("created_at", { ascending: false }),
    supabase
      .from("appointments")
      .select("id, during, status, services(name)")
      .eq("customer_profile_id", profileId)
      .eq("hairdresser_id", hairdresser?.id ?? "")
      .in("status", ["confirmed", "completed"])
      .order("during", { ascending: false })
      .limit(10),
  ]);
  if (!customer) notFound();

  const tz = organization.timezone;

  return (
    <div className="p-6 flex flex-col gap-6">
      <div>
        <Link href="/hairdresser" className="text-sm text-paper-50/60 underline underline-offset-2">
          Agenda
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-1">{customer.full_name ?? "Cliente"}</h1>
        {customer.phone && (
          <a href={`tel:${customer.phone.replace(/\s/g, "")}`} className="mt-2 h-11 px-4 rounded-md border border-paper-50/25 text-sm font-medium inline-flex items-center">
            Chiama {customer.phone}
          </a>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Note</h2>
        <p className="text-sm text-paper-50/60 -mt-2">Le vede solo lo staff, mai il cliente.</p>
        <NoteForm customerProfileId={profileId} />
        <ul className="flex flex-col gap-2">
          {(notes ?? []).map((note) => (
            <li key={note.id} className="rounded-md bg-ink-900 border border-paper-50/15 p-3 flex flex-col gap-2">
              <p className="whitespace-pre-wrap">{note.body}</p>
              <div className="flex items-center justify-between text-xs text-paper-50/50">
                <span>{DateTime.fromISO(note.created_at).setZone(tz).toFormat("d LLL yyyy")}</span>
                {note.author_profile_id === user?.id && (
                  <form action={deleteCustomerNote.bind(null, note.id, profileId)}>
                    <button type="submit" className="h-9 px-2 underline underline-offset-2">
                      Elimina
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Ultime visite con te</h2>
        {(visits ?? []).length === 0 && <p className="text-sm text-paper-50/60">Ancora nessuna visita.</p>}
        <ul className="flex flex-col divide-y divide-paper-50/10">
          {(visits ?? []).map((v) => {
            const service = Array.isArray(v.services) ? v.services[0] : v.services;
            const start = DateTime.fromMillis(parseRange(v.during as string).start, { zone: "utc" }).setZone(tz);
            return (
              <li key={v.id} className="py-2 flex justify-between text-sm">
                <span className="capitalize">{start.toFormat("cccc d LLLL")}</span>
                <span className="text-paper-50/60">{service?.name}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
