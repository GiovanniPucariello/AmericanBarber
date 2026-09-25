import { z } from "zod";

export const hairdresserSchema = z.object({
  displayName: z.string().trim().min(1, "Inserisci un nome."),
  bio: z.string().trim().max(2000).optional(),
  sortOrder: z.coerce.number().int(),
});

export const linkHairdresserAccountSchema = z.object({
  email: z.string().trim().email("Inserisci un indirizzo email valido."),
  password: z.string().min(8, "La password deve avere almeno 8 caratteri."),
});
