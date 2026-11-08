/**
 * ═══════════════════════════════════════════════════════════════════
 * VALIDATION PARTAGÉE — la même règle dans le navigateur et dans l'API
 * ═══════════════════════════════════════════════════════════════════
 * Le navigateur valide pour le confort (message immédiat), l'API revalide pour
 * la sécurité, la base revalide pour la cohérence. Une seule définition ici.
 * ═══════════════════════════════════════════════════════════════════
 */
import { z } from 'zod';

/** Téléphone ivoirien : 10 chiffres (01, 05, 07, 25, 27…), avec ou sans +225 → format E.164 */
export const telephoneCI = z
  .string()
  .transform((v) => v.replace(/[\s.-]/g, ''))
  .transform((v) => (v.startsWith('00225') ? `+${v.slice(2)}` : v.startsWith('225') ? `+${v}` : v.startsWith('+') ? v : `+225${v}`))
  .refine((v) => /^\+225(01|05|07|21|25|27)\d{8}$/.test(v), 'Numéro ivoirien invalide (10 chiffres)');

/** Montant en francs CFA : entier positif (pas de centimes) */
export const montantXOF = z.number().int().nonnegative().max(1_000_000_000);

export const email = z.email('Adresse e-mail invalide').max(254).transform((v) => v.toLowerCase());

export const motDePasse = z.string().min(10, '10 caractères minimum').max(128);

/** Période de location : retour après départ, départ dans le futur, 90 jours maximum */
export const periodeLocation = z
  .object({ debut: z.coerce.date(), fin: z.coerce.date() })
  .refine((p) => p.fin > p.debut, { message: 'La date de retour doit suivre la date de départ', path: ['fin'] })
  .refine((p) => p.debut.getTime() > Date.now() - 5 * 60_000, { message: 'La date de départ est passée', path: ['debut'] })
  .refine((p) => p.fin.getTime() - p.debut.getTime() <= 90 * 86_400_000, { message: '90 jours maximum', path: ['fin'] });

export const inscription = z.object({
  prenoms: z.string().trim().min(1).max(80),
  nom: z.string().trim().min(1).max(80),
  email: email.optional(),
  telephone: telephoneCI,
  motDePasse: motDePasse.optional(),
  communeId: z.number().int().positive().optional(),
  accepteCgu: z.literal(true, { message: 'Vous devez accepter les conditions' }),
  accepteMarketing: z.boolean().default(false),
});

/** Filtres du catalogue (lus depuis l'URL : tout est revalidé) */
export const filtresCatalogue = z.object({
  mode: z.enum(['rental', 'sale']).default('rental'),
  ville: z.string().max(60).optional(),
  rayonKm: z.coerce.number().int().min(1).max(200).optional(),
  prixMin: z.coerce.number().int().nonnegative().optional(),
  prixMax: z.coerce.number().int().positive().optional(),
  marques: z.array(z.coerce.number().int()).max(20).optional(),
  carburants: z.array(z.enum(['petrol', 'diesel', 'hybrid', 'plug_in_hybrid', 'electric', 'lpg'])).optional(),
  boite: z.enum(['manual', 'automatic']).optional(),
  places: z.coerce.number().int().min(2).max(60).optional(),
  avecChauffeur: z.coerce.boolean().optional(),
  tri: z.enum(['relevance', 'price_asc', 'price_desc', 'mileage_asc', 'distance', 'rating', 'newest']).default('relevance'),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export type FiltresCatalogue = z.infer<typeof filtresCatalogue>;
