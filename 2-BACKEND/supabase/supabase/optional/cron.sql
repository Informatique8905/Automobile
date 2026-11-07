-- Tâches planifiées optionnelles
SELECT cron.schedule('reconciliation-paiements', '*/5 * * * *', $$SELECT public.reveiller_api()$$);
