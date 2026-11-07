-- 0400 — Espace partenaire : loueurs, particuliers, vendeurs, concessionnaires
CREATE TABLE IF NOT EXISTS public.partenaires (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), proprietaire_id uuid NOT NULL);
