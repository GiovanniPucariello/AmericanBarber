import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { getNotificationFeed } from "@/lib/notifications/queries";
import { NotificationList } from "@/components/notifications/notification-list";

export default async function CustomerNotificationsPage() {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/app");

  const notifications = await getNotificationFeed();

  return <NotificationList notifications={notifications} timezone={organization.timezone} basePath="/app" />;
}
