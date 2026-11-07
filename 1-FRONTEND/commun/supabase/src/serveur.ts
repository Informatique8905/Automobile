/**
 * ═══════════════════════════════════════════════════════════════════
 * CLIENT SUPABASE — SERVEUR NEXT.JS (composants serveur, actions, routes)
 * ═══════════════════════════════════════════════════════════════════
 * Toujours la clé PUBLIQUE + la session de l'utilisateur (cookies) : la page
 * serveur a exactement les droits de l'utilisateur, pas plus.
 * Règle : vérifier l'utilisateur avec getUser() (revalidé par Supabase),
 * jamais avec getSession() seul (lu dans un cookie que l'on ne contrôle pas).
 * ═══════════════════════════════════════════════════════════════════
 */
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@plateforme/types';

export async function clientServeur() {
  const magasin = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => magasin.getAll(),
        setAll: (aEcrire) => {
          try {
            aEcrire.forEach(({ name, value, options }) => magasin.set(name, value, options));
          } catch {
            // Appelé depuis un composant serveur : le proxy renouvelle la session
          }
        },
      },
    },
  );
}
