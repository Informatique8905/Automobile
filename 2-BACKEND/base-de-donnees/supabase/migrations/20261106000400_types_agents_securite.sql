-- =============================================================================
-- 20261106-0400 — TYPES pour les agents IA de sécurité
-- (fichier séparé : une valeur ajoutée à un type énuméré ne peut pas être
--  utilisée dans la même transaction que son ajout)
-- =============================================================================

-- Nouveaux agents IA
alter type public.ai_job_type add value if not exists 'login_anomaly';          -- connexions suspectes
alter type public.ai_job_type add value if not exists 'payout_account_review';  -- changement de compte de versement
alter type public.ai_job_type add value if not exists 'payment_risk_scoring';   -- échecs de paiement répétés
alter type public.ai_job_type add value if not exists 'duplicate_photo_check';  -- photos volées / annonces clonées

-- Mode de fonctionnement d'un agent (déploiement progressif)
--   off    : arrêté (interrupteur d'urgence) — les tâches attendent
--   shadow : observe et note, sans aucun effet (phase de test)
--   assist : peut signaler pour revue humaine, ne masque/bloque jamais seul
--   auto   : peut masquer ou remettre en revue (jamais supprimer, jamais valider un KYC)
create type public.ai_agent_mode as enum ('off', 'shadow', 'assist', 'auto');

-- Droits « loi 2013-450 » exercés par les personnes concernées
create type public.privacy_request_type as enum ('access', 'export', 'rectification', 'opposition', 'restriction');
create type public.privacy_request_status as enum ('received', 'in_progress', 'completed', 'rejected');

-- Registre des violations de données (à notifier à l'ARTCI)
create type public.incident_status as enum ('open', 'contained', 'notified', 'closed');
