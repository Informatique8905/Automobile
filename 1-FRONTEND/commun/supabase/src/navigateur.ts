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

  // Côté serveur pendant le prerendering (build) : les variables NEXT_PUBLIC_
  // ne sont pas injectées si l'environnement n'a pas de .env.local.
  // On utilise des valeurs factices pour que Next.js puisse générer les pages
  // statiques sans faire d'appels réseau réels.
  if (!url || !cle) {
    if (typeof window !== 'undefined') {
      // Exécution dans le navigateur : les variables DOIVENT être présentes.
      throw new Error(
        '[AutoMobile] Configuration Supabase manquante.\n' +
        'Vérifiez que NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ' +
        'sont définis dans votre fichier .env.local (développement) ou dans les variables ' +
        "d'environnement de déploiement (production).",
      );
    }
    // SSR / prerendering uniquement — jamais exécuté en production
    return createBrowserClient<Database>(
      'https://placeholder.supabase.co',
      'placeholder-anon-key',
    );
  }

  return createBrowserClient<Database>(url, cle);
}
