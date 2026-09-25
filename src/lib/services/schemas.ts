import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().trim().min(1, "Inserisci un nome."),
  description: z.string().trim().max(500).optional(),
  durationMinutes: z.coerce.number().int().min(5, "La durata deve essere di almeno 5 minuti."),
  priceCents: z.coerce.number().int().min(0).optional(),
  sortOrder: z.coerce.number().int(),
});
