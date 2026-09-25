import { HairdresserForm } from "@/components/hairdressers/hairdresser-form";
import { createHairdresser } from "@/lib/hairdressers/actions";

export default function NewHairdresserPage() {
  return <HairdresserForm action={createHairdresser} />;
}
