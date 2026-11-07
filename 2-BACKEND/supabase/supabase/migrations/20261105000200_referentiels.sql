-- 0200 — Référentiels : géographie, catégories, marques/modèles, équipements
CREATE TABLE IF NOT EXISTS public.villes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nom text NOT NULL);
