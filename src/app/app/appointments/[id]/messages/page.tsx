import { notFound, redirect } from "next/navigation";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { getAppointmentThread, markThreadRead } from "@/lib/messages/queries";
import { parseRange } from "@/lib/availability/intervals";
import { MessageThread } from "@/components/messages/message-thread";

export default async function CustomerAppointmentMessagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/app");

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/app");

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, during, status, hairdressers(display_name), services(name)")
    .eq("id", id)
    .eq("customer_profile_id", user.id)
    .maybeSingle();
  if (!appointment) notFound();

  await markThreadRead(supabase, id);
  const messages = await getAppointmentThread(supabase, id, user.id);

  const hairdresser = Array.isArray(appointment.hairdressers)
    ? appointment.hairdressers[0]
    : appointment.hairdressers;
  const service = Array.isArray(appointment.services) ? appointment.services[0] : appointment.services;
  const start = DateTime.fromMillis(parseRange(appointment.during as string).start, {
    zone: "utc",
  }).setZone(organization.timezone);

  return (
    <div className="p-6 flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Messaggi</h1>
        <p className="text-paper-50/60 text-sm">
          {hairdresser?.display_name} - {service?.name} - {start.toFormat("cccc d LLLL, HH:mm")}
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
