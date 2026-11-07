-- Réveil de l'API Render depuis pg_cron/pg_net
SELECT net.http_post(url := current_setting('app.api_url'), headers := '{"content-type":"application/json"}'::jsonb, body := '{"source":"pg_cron"}'::jsonb);
