/**
 * ─────────────────────────────────────────────────────────────────────────────
 * LIMITES DE REQUÊTES (anti-abus, anti-robots, anti-force brute)
 * ─────────────────────────────────────────────────────────────────────────────
 * RÔLE
 *   Une seule liste, lue par l'API (NestJS Throttler). Les limites de connexion
 *   (mots de passe, codes SMS) sont en plus appliquées par Supabase Auth.
 *
 * CLÉ DE LIMITATION
 *   « ip »          : visiteur anonyme (adresse IP hachée)
 *   « utilisateur » : identifiant Supabase du jeton vérifié
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface Limite {
  /** Nombre de requêtes autorisées */
  limite: number;
  /** Fenêtre en secondes */
  fenetreSecondes: number;
  cle: 'ip' | 'utilisateur';
}

export const LIMITES = {
  /** Lecture publique passant par l'API (rare : le catalogue va directement à Supabase) */
  public: { limite: 120, fenetreSecondes: 60, cle: 'ip' },
  /** Création d'une session de paiement Jeko */
  initierPaiement: { limite: 10, fenetreSecondes: 3600, cle: 'utilisateur' },
  /** Démarrage d'une vérification d'identité (coûte de l'argent à chaque appel) */
  sessionKyc: { limite: 3, fenetreSecondes: 86400, cle: 'utilisateur' },
  /** Envoi de photos (annonces, états des lieux) */
  envoiFichier: { limite: 60, fenetreSecondes: 3600, cle: 'utilisateur' },
  /** Téléchargement de contrats / factures (URL signées) */
  telechargement: { limite: 60, fenetreSecondes: 3600, cle: 'utilisateur' },
  /** Export « mes données » */
  exportDonnees: { limite: 2, fenetreSecondes: 86400, cle: 'utilisateur' },
  /** Actions du back-office */
  administrateur: { limite: 600, fenetreSecondes: 3600, cle: 'utilisateur' },
} as const satisfies Record<string, Limite>;

/**
 * Webhooks (Jeko, KYC) : pas de limite par IP (le prestataire peut renvoyer en
 * rafale) mais signature obligatoire et traitement idempotent.
 * Tâches internes (/interne/taches) : secret partagé obligatoire, 1 exécution à la fois.
 */
