-- 1100 — Devis transparent, réservation atomique, paiement idempotent
CREATE OR REPLACE FUNCTION public.quote_rental() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
