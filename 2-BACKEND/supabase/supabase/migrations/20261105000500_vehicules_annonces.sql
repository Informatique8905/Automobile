-- 0500 — Véhicules, flotte, médias, documents, annonces
CREATE TABLE IF NOT EXISTS public.vehicules (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), partenaire_id uuid NOT NULL);
