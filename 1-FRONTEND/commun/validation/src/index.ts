import { z } from "zod";
export const telephoneIvoirien = z.string().regex(/^\+225[0-9]{10}$/, "Numéro ivoirien invalide");
export const prixFcfa = z.number().int().nonnegative();
export const datesLocation = z.object({ debut: z.string().date(), fin: z.string().date() }).refine((d) => d.fin >= d.debut, "La fin doit suivre le début");
