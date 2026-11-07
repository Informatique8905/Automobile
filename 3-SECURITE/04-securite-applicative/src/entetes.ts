/**
 * ─────────────────────────────────────────────────────────────────────────────
 * EN-TÊTES DE SÉCURITÉ HTTP — partagés par les 3 applications frontend
 * ─────────────────────────────────────────────────────────────────────────────
 * RÔLE
 *   Dire au navigateur ce qu'il a le droit de charger et d'exécuter.
 *   Bloque l'essentiel des attaques XSS, le « clickjacking », les fuites de
 *   référent et les téléchargements de scripts depuis des domaines inconnus.
 *
 * DIFFÉRENCE PAR APPLICATION
 *   client          : CSP sans nonce (les pages restent statiques et rapides pour
 *                     Google), mais connexions, cadres et formulaires verrouillés.
 *   vendeur         : idem + aucune indexation.
 *   administrateur  : CSP STRICTE avec nonce (générée à chaque requête dans le
 *                     proxy Next.js), aucune indexation, aucun cadre, aucune source tierce.
 *
 * UTILISATION
 *   next.config.ts        → headers() { return [{ source: '/(.*)', headers: entetesSecurite('client', {...}) }] }
 *   src/proxy.ts (admin) → construireCsp('administrateur', { ..., nonce })
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type Application = 'client' | 'vendeur' | 'administrateur';

export interface OptionsSecurite {
  /** https://xxxx.supabase.co */
  supabaseUrl: string;
  /** https://api.votre-domaine.ci */
  apiUrl: string;
  /** Nonce aléatoire (administrateur uniquement, généré dans src/proxy.ts) */
  nonce?: string;
  /** Domaines supplémentaires autorisés pour les images (fonds de carte, etc.) */
  imagesSupplementaires?: string[];
  /** Domaines supplémentaires autorisés en connexion (mesure d'audience consentie, etc.) */
  connexionsSupplementaires?: string[];
}

/** Domaines de paiement : la page Jeko s'ouvre par redirection, jamais dans un cadre. */
const DOMAINES_PAIEMENT = ['https://*.jeko.africa'];

function wss(url: string): string {
  return url.replace(/^https:/, 'wss:');
}

export function construireCsp(app: Application, o: OptionsSecurite): string {
  const strict = app === 'administrateur';

  const scripts = strict
    ? [`'self'`, `'nonce-${o.nonce ?? ''}'`, `'strict-dynamic'`]
    : [`'self'`, `'unsafe-inline'`]; // Next.js injecte des scripts en ligne ; compensé par les autres directives

  const directives: Record<string, string[]> = {
    'default-src': [`'self'`],
    'script-src': scripts,
    'style-src': [`'self'`, `'unsafe-inline'`],
    'img-src': [`'self'`, 'data:', 'blob:', o.supabaseUrl, ...(o.imagesSupplementaires ?? [])],
    'font-src': [`'self'`],
    'connect-src': [`'self'`, o.supabaseUrl, wss(o.supabaseUrl), o.apiUrl, ...(o.connexionsSupplementaires ?? [])],
    'frame-src': [`'none'`],
    'frame-ancestors': [`'none'`],
    'object-src': [`'none'`],
    'base-uri': [`'self'`],
    'form-action': [`'self'`, ...DOMAINES_PAIEMENT],
    'worker-src': [`'self'`, 'blob:'],
    'manifest-src': [`'self'`],
    'upgrade-insecure-requests': [],
  };

  if (strict) {
    directives['img-src'] = [`'self'`, 'data:', 'blob:', o.supabaseUrl];
    directives['connect-src'] = [`'self'`, o.supabaseUrl, wss(o.supabaseUrl), o.apiUrl];
    directives['form-action'] = [`'self'`];
  }

  return Object.entries(directives)
    .map(([nom, valeurs]) => (valeurs.length ? `${nom} ${valeurs.join(' ')}` : nom))
    .join('; ');
}

export interface Entete {
  key: string;
  value: string;
}

export function entetesSecurite(app: Application, o: OptionsSecurite): Entete[] {
  const entetes: Entete[] = [
    // HTTPS obligatoire pendant 2 ans, sous-domaines compris
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    {
      key: 'Permissions-Policy',
      // Caméra : photos du permis (client) et états des lieux (vendeur) ; jamais en admin
      value:
        app === 'administrateur'
          ? 'camera=(), microphone=(), geolocation=(), payment=()'
          : 'camera=(self), microphone=(), geolocation=(self), payment=()',
    },
  ];

  // Le back-office fixe sa CSP avec nonce dans src/proxy.ts
  if (app !== 'administrateur') {
    entetes.push({ key: 'Content-Security-Policy', value: construireCsp(app, o) });
  }

  // Seul le site client est indexé par les moteurs de recherche
  if (app !== 'client') {
    entetes.push({ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' });
  }

  return entetes;
}
