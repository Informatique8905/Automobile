-- 1000 — Support : tickets, formulaire dynamique, chatbot, WhatsApp
CREATE TABLE IF NOT EXISTS public.tickets_support (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), utilisateur_id uuid NOT NULL);
