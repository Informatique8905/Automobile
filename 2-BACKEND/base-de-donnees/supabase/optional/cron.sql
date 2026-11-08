-- =============================================================================
-- TÂCHES PLANIFIÉES (optionnel) — à exécuter UNE FOIS dans l'éditeur SQL Supabase
-- après avoir activé l'extension pg_cron (Dashboard → Database → Extensions).
-- Alternative : appeler ces mêmes fonctions depuis un cron Vercel (route API
-- protégée, clé service_role côté serveur).
-- =============================================================================

create extension if not exists pg_cron;

-- Réservations non payées / demandes sans réponse → expirées (+ remboursement)
select cron.schedule('expire-stale-bookings', '*/5 * * * *', $$select public.expire_stale_bookings()$$);

-- Acomptes de vente arrivés à échéance
select cron.schedule('expire-sale-reservations', '*/15 * * * *', $$select public.expire_sale_reservations()$$);

-- Libération des cautions 72 h après le retour (sans litige)
select cron.schedule('release-deposits', '0 * * * *', $$select public.release_due_deposits()$$);

-- Taux de réponse et badge Super hôte (chaque nuit à 3 h, heure d'Abidjan = UTC)
select cron.schedule('refresh-partner-stats', '0 3 * * *', $$select public.refresh_partner_stats()$$);

-- Purge des notifications lues de plus de 6 mois
select cron.schedule('purge-notifications', '30 3 * * 0',
  $$delete from public.notifications where read_at is not null and read_at < now() - interval '6 months'$$);

-- Pour lister / supprimer :
--   select * from cron.job;
--   select cron.unschedule('expire-stale-bookings');
