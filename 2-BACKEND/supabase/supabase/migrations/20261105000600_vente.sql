-- 0600 — Parcours vente : essais, acompte de réservation, financement
CREATE TABLE IF NOT EXISTS public.essais (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), annonce_id uuid NOT NULL);
