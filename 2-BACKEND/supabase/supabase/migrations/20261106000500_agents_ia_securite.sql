-- 20261106-0500 — Agents IA pilotables, journal et revue humaine
CREATE TABLE IF NOT EXISTS public.ai_agents (id text PRIMARY KEY, mode public.agent_mode NOT NULL DEFAULT 'observation');
