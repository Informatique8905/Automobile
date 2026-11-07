-- 20261106-0200 — Double authentification obligatoire pour l'équipe
CREATE TABLE IF NOT EXISTS public.mfa_factors (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), utilisateur_id uuid NOT NULL);
