import { z } from "zod";

// Postgres's uuid column doesn't enforce RFC 4122 version/variant bits, and
// this project's own seed data uses placeholder ids like
// "00000000-0000-0000-0000-000000000301" that fail Zod's strict .uuid()
// (which checks those bits) despite being perfectly valid uuid values in
// the database. Match what Postgres actually accepts instead.
const looseUuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Id non valido.");

export const createAppointmentSchema = z.object({
  hairdresserId: looseUuid,
  serviceId: looseUuid,
  startUtc: z.string().datetime(),
});

// A barber booking on their own agenda: a registered customer (picked from
// the shop's customers, so they get notified) or a walk-in's free-text name.
export const staffBookingSchema = z
  .object({
    serviceId: looseUuid,
    startUtc: z.string().datetime(),
    customerProfileId: looseUuid.optional().or(z.literal("")),
    guestName: z.string().trim().max(100, "Nome troppo lungo.").optional().or(z.literal("")),
    recurring: z.literal("on").optional(),
    intervalWeeks: z.coerce.number().int().min(1).max(2).default(1),
    endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida.").optional().or(z.literal("")),
  })
  .refine((v) => v.customerProfileId || v.guestName, {
    message: "Scegli un cliente registrato o scrivi il nome del cliente.",
    path: ["guestName"],
  });
