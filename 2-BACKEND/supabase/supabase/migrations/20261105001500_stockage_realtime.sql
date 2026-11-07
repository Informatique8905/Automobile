-- 1500 — Buckets Storage et politiques Realtime
INSERT INTO storage.buckets (id, name) VALUES ('public-media', 'public-media') ON CONFLICT DO NOTHING;
