/**
 * ═══════════════════════════════════════════════════════════════════
 * CLIENT SUPABASE — NAVIGATEUR (composants « use client »)
 * ═══════════════════════════════════════════════════════════════════
 * Clé PUBLIQUE uniquement : tout ce que ce client peut faire est limité par
 * les règles RLS de la base. Session stockée en cookie, renouvelée automatiquement.
 * ═══════════════════════════════════════════════════════════════════
 */
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@plateforme/types';

export function clientNavigateur() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
