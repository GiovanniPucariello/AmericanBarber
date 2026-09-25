import { z } from "zod";

const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Usa il formato HH:MM.");

export const availabilityRuleSchema = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6),
    startTime: timeSchema,
    endTime: timeSchema,
  })
  .refine((v) => v.endTime > v.startTime, {
    message: "L'orario di fine deve essere dopo quello di inizio.",
    path: ["endTime"],
  });

export const availabilityExceptionSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida."),
    type: z.enum(["unavailable_all_day", "unavailable_range", "extra_range"]),
    startTime: timeSchema.optional().or(z.literal("")),
    endTime: timeSchema.optional().or(z.literal("")),
    reason: z.string().trim().max(500).optional(),
  })
  .refine(
    (v) =>
      v.type === "unavailable_all_day" ||
      (!!v.startTime && !!v.endTime && v.endTime > v.startTime),
    {
      message: "Le eccezioni con intervallo richiedono un orario di inizio e fine (fine dopo l'inizio).",
      path: ["endTime"],
    },
  );

export const blockedSlotSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida."),
    startTime: timeSchema,
    endTime: timeSchema,
    reason: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.endTime > v.startTime, {
    message: "L'orario di fine deve essere dopo quello di inizio.",
    path: ["endTime"],
  });
