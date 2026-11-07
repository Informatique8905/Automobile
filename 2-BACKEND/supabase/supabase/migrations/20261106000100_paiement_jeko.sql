-- 20261106-0100 — Jeko comme prestataire unique de paiement
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS paiement_id text;
