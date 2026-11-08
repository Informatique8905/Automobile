/**
 * ═══════════════════════════════════════════════════════════════════
 * JOURNAUX DE L'API — sans aucune donnée personnelle ni secret
 * ═══════════════════════════════════════════════════════════════════
 * pino (JSON, rapide). Les champs sensibles sont masqués automatiquement,
 * même si un développeur les journalise par erreur.
 * Lecture : tableau de bord Render (7 jours), puis service de journaux si besoin.
 * ═══════════════════════════════════════════════════════════════════
 */
import pino from 'pino';
import { env } from '../config/env';

export const journal = pino({
  level: env.LOG_LEVEL,
  base: { service: 'api' },
  redact: {
    paths: [
      'req.headers.authorization', 'req.headers.cookie', 'req.headers["x-cron-secret"]', 'req.headers["jeko-signature"]',
      '*.password', '*.motDePasse', '*.token', '*.jeton', '*.access_token', '*.refresh_token',
      '*.phone', '*.telephone', '*.email', '*.document_number', '*.account_number', '*.destination', '*.body',
    ],
    censor: '[masqué]',
  },
});
