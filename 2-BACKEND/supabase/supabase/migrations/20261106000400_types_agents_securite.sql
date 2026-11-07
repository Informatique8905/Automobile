-- 20261106-0400 — Types pour les agents IA de sécurité
DO $$ BEGIN CREATE TYPE public.agent_mode AS ENUM ('off','observation','assistance','auto'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
