import { z } from "zod";

const hexColor = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, "Usa un colore esadecimale come #8C1F28.")
  .optional()
  .or(z.literal(""));

export const organizationSettingsSchema = z.object({
  name: z.string().trim().min(1, "Inserisci un nome."),
  timezone: z.string().trim().min(1, "Inserisci un fuso orario."),
  primaryColor: hexColor,
  secondaryColor: hexColor,
  accentColor: hexColor,
  bookingIntervalMinutes: z.coerce.number().int().min(5).max(120),
});
