-- 0800 — Messagerie contextuelle, avis, notifications et préférences
CREATE TABLE IF NOT EXISTS public.notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), utilisateur_id uuid NOT NULL);
