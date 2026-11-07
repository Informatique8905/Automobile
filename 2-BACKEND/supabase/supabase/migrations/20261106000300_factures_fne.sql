-- 20261106-0300 — Facture normalisée électronique DGI/FNE
CREATE TABLE IF NOT EXISTS public.factures_fne (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), facture_id uuid NOT NULL);
