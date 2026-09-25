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
