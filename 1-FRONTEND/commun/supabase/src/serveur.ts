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
  // cookies() marque la route comme dynamique : sans lui, Next essaierait de
  // pré-rendre la page au build et le contrôle de configuration ci-dessous
  // ferait échouer `next build` quand les variables ne sont pas encore injectées.
  const magasin = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !cle) {
    throw new Error(
      '[AutoMobile] Configuration Supabase manquante.\n' +
      'Vérifiez que NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ' +
      'sont définis dans votre fichier .env.local (développement) ou dans les variables ' +
      "d'environnement de déploiement (production).",
    );
  }

  return createServerClient<Database>(
    url,
    cle,
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
