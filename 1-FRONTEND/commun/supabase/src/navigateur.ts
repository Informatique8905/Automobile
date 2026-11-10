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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Le prerender de `next build` s'exécute sans fenêtre : on y tolère une
  // adresse factice pour générer les pages statiques. Ailleurs (SSR runtime,
  // navigateur, dev), une variable manquante est une erreur de configuration.
  const estBuild = process.env.NEXT_PHASE === 'phase-production-build';
  if (!url || !cle) {
    if (typeof window !== 'undefined' || !estBuild) {
      throw new Error(
        '[AutoMobile] Configuration Supabase manquante.\n' +
        'Vérifiez que NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ' +
        'sont définis dans votre fichier .env.local (développement) ou dans les variables ' +
        "d'environnement de déploiement (production).",
      );
    }
    return createBrowserClient<Database>(
      'https://placeholder.supabase.co',
      'placeholder-anon-key',
    );
  }

  return createBrowserClient<Database>(url, cle);
}
