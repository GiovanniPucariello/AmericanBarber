import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email("Inserisci un indirizzo email valido.");

export const passwordSchema = z
  .string()
  .min(8, "La password deve avere almeno 8 caratteri.");

export const signUpSchema = z.object({
  fullName: z.string().trim().min(1, "Inserisci il tuo nome."),
  email: emailSchema,
  password: passwordSchema,
});

export const passwordSignInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Inserisci la tua password."),
});

export const magicLinkSchema = z.object({
  email: emailSchema,
});

export const resetRequestSchema = z.object({
  email: emailSchema,
});

export const updatePasswordSchema = z.object({
  password: passwordSchema,
});
