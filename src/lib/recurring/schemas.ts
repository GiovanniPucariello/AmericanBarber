import { z } from "zod";

const looseUuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Id non valido.");

export const createRecurringBookingSchema = z
  .object({
    hairdresserId: looseUuid,
    serviceId: looseUuid,
    weekday: z.coerce.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Usa il formato HH:MM."),
    intervalWeeks: z.coerce.number().int().min(1).max(12),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida."),
    endsOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida.")
      .optional()
      .or(z.literal("")),
  })
  .refine((v) => !v.endsOn || v.endsOn >= v.startsOn, {
    message: "La data di fine deve essere dopo quella di inizio.",
    path: ["endsOn"],
  });
