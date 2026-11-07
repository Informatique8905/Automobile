-- 1600 — Back-office : référentiels et contenus
CREATE TABLE IF NOT EXISTS public.contenus (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL);
