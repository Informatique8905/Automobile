-- 1350 — Helpers d'accès véhicules/annonces et gestion d'équipe partenaire
CREATE OR REPLACE FUNCTION public.peut_gerer_annonce() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
