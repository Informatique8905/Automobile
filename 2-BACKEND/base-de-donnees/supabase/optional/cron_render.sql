-- =============================================================================
-- RÉVEIL DU BACKEND RENDER (optionnel) — à exécuter UNE FOIS dans l'éditeur SQL
-- Supabase, après avoir activé pg_cron et pg_net (Dashboard → Database → Extensions).
--
-- Pourquoi : sur l'offre gratuite de Render, le backend s'endort après 15 minutes
-- sans requête et met environ 1 minute à se réveiller. Les agents IA, la
-- certification FNE, la réconciliation des paiements Jeko et les notifications
-- ne tourneraient donc jamais la nuit. Vercel Hobby ne permet qu'un cron par jour.
--
-- Solution : la base appelle elle-même le backend toutes les 5 minutes en journée
-- (6 h – minuit, heure d'Abidjan = UTC) et une fois par heure la nuit.
-- Consommation : ~18 h/jour + 6 × 15 min la nuit ≈ 600 h/mois, sous les 750 h
-- gratuites de Render. ⚠ Ces 750 h sont partagées par TOUS les services gratuits
-- du compte Render : un seul service gratuit allumé en permanence.
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 1. Secrets rangés dans le coffre Supabase (jamais en clair dans une tâche cron)
--    Remplacer les deux valeurs, puis exécuter.
select vault.create_secret('https://votre-api.onrender.com', 'render_api_url',
                           'Adresse publique du backend Render');
select vault.create_secret('REMPLACER-par-une-longue-chaine-aleatoire-64-caracteres', 'render_cron_secret',
                           'Secret partagé avec le backend (variable CRON_SECRET sur Render)');

-- 2. Fonction d'appel (le backend vérifie l'en-tête X-Cron-Secret)
create or replace function private.call_render_tasks()
returns bigint
language sql
security definer
set search_path = ''
as $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'render_api_url')
               || '/interne/taches/executer',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'X-Cron-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'render_cron_secret')),
    body    := jsonb_build_object('source', 'pg_cron', 'at', now()),
    timeout_milliseconds := 5000
  );
$$;
revoke execute on function private.call_render_tasks() from public, anon, authenticated;

-- 3. Planification
select cron.schedule('render-jour', '*/5 6-23 * * *', $$select private.call_render_tasks()$$);
select cron.schedule('render-nuit', '0 0-5 * * *',    $$select private.call_render_tasks()$$);

-- Suivi des appels : select * from net._http_response order by created desc limit 20;
-- Arrêt : select cron.unschedule('render-jour'); select cron.unschedule('render-nuit');
