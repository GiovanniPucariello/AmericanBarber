import { z } from "zod";

export const sendAppointmentMessageSchema = z.object({
  body: z.string().trim().min(1, "Scrivi un messaggio.").max(1000, "Messaggio troppo lungo (max 1000 caratteri)."),
});
