/**
 * ═══════════════════════════════════════════════════════════════════
 * CONFIGURATION — variables d'environnement vérifiées au démarrage
 * ═══════════════════════════════════════════════════════════════════
 * Si une variable obligatoire manque ou est mal formée, l'API REFUSE de
 * démarrer (mieux vaut un déploiement en échec qu'une API qui accepte des
 * webhooks sans secret). Liste complète et explications : /.env.example
 * ═══════════════════════════════════════════════════════════════════
 */
import { z } from 'zod';

const liste = z.string().transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean));
const nombreOptionnel = z.coerce.number().positive().optional();

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_PUBLIC_URL: z.url(),
  ALLOWED_ORIGINS: liste,

  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  SUPABASE_SECRET_KEY: z.string().min(20),
  SUPABASE_JWKS_URL: z.url(),

  CRON_SECRET: z.string().min(32, 'CRON_SECRET : 32 caractères minimum'),

  // 'jeko' = API réelle · 'simulation' = fournisseur de test (page + webhook signé)
  PAIEMENT_MODE: z.enum(['simulation', 'jeko']).default('simulation'),
  // La simulation en production exige un drapeau explicite, retiré au branchement Jeko.
  AUTORISER_PAIEMENT_SIMULATION: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  PAIEMENT_SIMULATION_SECRET: z.string().min(16).optional(),

  JEKO_API_URL: z.url().optional(),
  JEKO_API_KEY: z.string().min(1).optional(),
  JEKO_WEBHOOK_SECRET: z.string().min(16).optional(),
  JEKO_RETURN_URL: z.url().optional(),

  FNE_API_URL: z.url().optional(),
  FNE_API_KEY: z.string().optional(),

  KYC_PROVIDER: z.string().optional(),
  KYC_API_KEY: z.string().optional(),
  KYC_WEBHOOK_SECRET: z.string().optional(),

  LLM_PROVIDER: z.enum(['anthropic', 'factice']).default('factice'),
  LLM_API_KEY: z.string().optional(),
  LLM_DEFAULT_MODEL: z.string().default('claude-haiku-5-5'),
  LLM_PRIX_ENTREE_USD_PAR_MTOK: nombreOptionnel,
  LLM_PRIX_SORTIE_USD_PAR_MTOK: nombreOptionnel,

  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Plateforme <no-reply@votre-domaine.ci>'),
  SMS_API_KEY: z.string().optional(),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),

  PAYOUT_ENCRYPTION_KEY: z.string().refine((v) => Buffer.from(v, 'base64').length === 32, 'PAYOUT_ENCRYPTION_KEY : 32 octets en base64'),

  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const resultat = schema.safeParse(process.env);
if (!resultat.success) {
  // Affiche le NOM des variables en défaut, jamais leur valeur
  const champs = resultat.error.issues.map((i) => `${i.path.join('.')} : ${i.message}`);
  console.error(`Configuration invalide :\n - ${champs.join('\n - ')}`);
  process.exit(1);
}

const config = resultat.data;
const manquants: string[] = [];

if (config.PAIEMENT_MODE === 'jeko') {
  for (const cle of ['JEKO_API_URL', 'JEKO_API_KEY', 'JEKO_WEBHOOK_SECRET', 'JEKO_RETURN_URL'] as const) {
    if (!config[cle]) manquants.push(cle);
  }
}
if (config.PAIEMENT_MODE === 'simulation' && !config.PAIEMENT_SIMULATION_SECRET) {
  manquants.push('PAIEMENT_SIMULATION_SECRET');
}
if (config.NODE_ENV === 'production' && config.PAIEMENT_MODE === 'simulation' && !config.AUTORISER_PAIEMENT_SIMULATION) {
  console.error('PAIEMENT_MODE=simulation interdit en production sans AUTORISER_PAIEMENT_SIMULATION=true (à retirer au branchement Jeko)');
  process.exit(1);
}
if (manquants.length) {
  console.error(`Configuration invalide : variables obligatoires manquantes selon PAIEMENT_MODE=${config.PAIEMENT_MODE} : ${manquants.join(', ')}`);
  process.exit(1);
}

if (config.NODE_ENV === 'production' && config.LLM_PROVIDER === 'anthropic' && !config.LLM_API_KEY) {
  console.error('LLM_API_KEY obligatoire quand LLM_PROVIDER=anthropic');
  process.exit(1);
}

export const env = config;
export type Env = typeof env;
