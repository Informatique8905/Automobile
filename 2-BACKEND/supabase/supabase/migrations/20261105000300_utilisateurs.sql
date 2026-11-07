-- 0300 — Comptes utilisateurs : profils, rôles, préférences, consentements
CREATE TABLE IF NOT EXISTS public.profils (id uuid PRIMARY KEY REFERENCES auth.users(id), nom text);
