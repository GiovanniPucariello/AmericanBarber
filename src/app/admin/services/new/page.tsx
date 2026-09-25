import { ServiceForm } from "@/components/services/service-form";
import { createService } from "@/lib/services/actions";

export default function NewServicePage() {
  return <ServiceForm action={createService} />;
}
