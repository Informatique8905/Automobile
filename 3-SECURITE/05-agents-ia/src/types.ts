/**
 * Types partagés par tous les agents IA.
 * Les noms de types de tâches correspondent à l'énumération `ai_job_type` de la base.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type TypeTache =
  | 'listing_moderation'
  | 'photo_moderation'
  | 'message_screening'
  | 'document_precheck'
  | 'booking_risk_scoring'
  | 'review_moderation'
  | 'login_anomaly'
  | 'payout_account_review'
  | 'payment_risk_scoring'
  | 'duplicate_photo_check';

export type Decision = 'pass' | 'flag' | 'block';

/** Ce que rend un agent. La base applique ensuite les seuils et le mode (off/shadow/assist/auto). */
export interface Verdict {
  decision: Decision;
  /** 0 = aucun risque, 100 = certain */
  risk_score: number;
  /** code court, ex. off_platform_payment, stolen_photo, price_too_low */
  reason_code: string;
  /** explication courte pour le modérateur (jamais affichée au client) */
  summary: string;
  /** indices détectés, ex. ["phone_number", "wave_direct"] */
  flags: string[];
}

/** Une tâche réclamée dans `ai_jobs`. */
export interface Tache {
  id: number;
  job_type: TypeTache;
  entity_type: string;
  entity_id: string;
  attempts: number;
}

/** Réglage d'un agent lu dans `ai_agents` (modifiable dans le back-office). */
export interface ReglageAgent {
  job_type: TypeTache;
  mode: 'off' | 'shadow' | 'assist' | 'auto';
  model: string | null;
  prompt_version: string;
}

/** Ce qu'un agent prépare avant analyse. */
export interface Entree {
  /** Texte saisi par des utilisateurs (sera masqué puis encadré) */
  texteUtilisateur?: string;
  /** Faits calculés par le système (fiables) */
  faits: Record<string, unknown>;
  /** Images publiques à montrer au modèle (photos d'annonces uniquement) */
  images?: string[];
}

export interface ContexteAgent {
  /** Client Supabase avec la clé secrète (backend uniquement) */
  base: SupabaseClient;
  llm: FournisseurLLM;
  modeleParDefaut: string;
  journal: (niveau: 'info' | 'warn' | 'error', message: string, details?: Record<string, unknown>) => void;
}

export interface RequeteLLM {
  modele: string;
  systeme: string;
  message: string;
  images?: string[];
  maxTokens?: number;
}

export interface ReponseLLM {
  texte: string;
  tokensEntree: number;
  tokensSortie: number;
  coutUsd: number | null;
}

export interface FournisseurLLM {
  nom: string;
  analyser(r: RequeteLLM): Promise<ReponseLLM>;
}

export interface DefinitionAgent {
  type: TypeTache;
  nom: string;
  /** true : analyse par le modèle IA ; false : règles déterministes seulement */
  utiliseLLM: boolean;
  /** nom du fichier dans prompts/ (agents IA uniquement) */
  prompt?: string;
  charger(ctx: ContexteAgent, idEntite: string): Promise<Entree | null>;
  /** décision par règles (agents sans IA) ou complément aux signaux de l'IA */
  regles?(entree: Entree): Verdict;
}
