-- 0700 — Tunnel de réservation, disponibilités, état des lieux, paiements
CREATE TABLE IF NOT EXISTS public.reservations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), vehicule_id uuid NOT NULL);
