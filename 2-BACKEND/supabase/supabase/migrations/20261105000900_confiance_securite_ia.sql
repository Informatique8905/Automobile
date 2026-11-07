-- 0900 — Signalements, modération, signaux de fraude et agents IA
CREATE TABLE IF NOT EXISTS public.ai_jobs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), type text NOT NULL, statut text NOT NULL);
