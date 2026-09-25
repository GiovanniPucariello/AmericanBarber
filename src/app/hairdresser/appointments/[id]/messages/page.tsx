import { notFound, redirect } from "next/navigation";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { getCurrentHairdresser } from "@/lib/hairdressers/queries";
import { getAppointmentThread, markThreadRead } from "@/lib/messages/queries";
import { parseRange } from "@/lib/availability/intervals";
import { MessageThread } from "@/components/messages/message-thread";

export default async function HairdresserAppointmentMessagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/app");

  const hairdresser = await getCurrentHairdresser(organization.id);
  if (!hairdresser) {
    return (
      <div className="p-6">
        <p className="text-paper-50/70">
          Il tuo account non è ancora collegato a un profilo barbiere.
        </p>
      </div>
    );
  }

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/app");

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, during, status, customer_profile_id, services(name)")
    .eq("id", id)
    .eq("hairdresser_id", hairdresser.id)
    .maybeSingle();
  if (!appointment) notFound();

  const { data: customer } = await supabase
    .from("co_member_profiles")
    .select("full_name")
    .eq("id", appointment.customer_profile_id)
    .maybeSingle();

  await markThreadRead(supabase, id);
  const messages = await getAppointmentThread(supabase, id, user.id);

  const service = Array.isArray(appointment.services) ? appointment.services[0] : appointment.services;
  const start = DateTime.fromMillis(parseRange(appointment.during as string).start, {
    zone: "utc",
  }).setZone(organization.timezone);

  return (
    <div className="p-6 flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Messaggi</h1>
        <p className="text-paper-50/60 text-sm">
          {customer?.full_name ?? "Cliente"} - {service?.name} - {start.toFormat("cccc d LLLL, HH:mm")}
        </p>
      </div>
      <MessageThread
        appointmentId={id}
        messages={messages}
        canSend={appointment.status === "pending" || appointment.status === "confirmed"}
      />
    </div>
  );
}
