/**
 * Registre des agents : un agent par type de tâche `ai_jobs.job_type`.
 * Ajouter un agent = 1) ajouter la valeur à l'énumération en base (migration),
 * 2) l'inscrire dans `ai_agents` en mode « shadow », 3) le déclarer ici.
 */
import type { DefinitionAgent, TypeTache } from '../types.ts';
import { filtrageMessages, moderationAnnonces, moderationAvis, moderationPhotos } from './contenus.ts';
import {
  comptesVersement,
  connexionsSuspectes,
  photosCopiees,
  preControleDocuments,
  risquePaiements,
  risqueReservation,
} from './securite.ts';

export const AGENTS: Record<TypeTache, DefinitionAgent> = {
  listing_moderation: moderationAnnonces,
  photo_moderation: moderationPhotos,
  message_screening: filtrageMessages,
  review_moderation: moderationAvis,
  document_precheck: preControleDocuments,
  booking_risk_scoring: risqueReservation,
  login_anomaly: connexionsSuspectes,
  payout_account_review: comptesVersement,
  payment_risk_scoring: risquePaiements,
  duplicate_photo_check: photosCopiees,
};
