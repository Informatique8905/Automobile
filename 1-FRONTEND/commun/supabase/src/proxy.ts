/**
 * ═══════════════════════════════════════════════════════════════════
 * SESSION DANS LE MIDDLEWARE NEXT.JS (src/middleware.ts de chaque app)
 * ═══════════════════════════════════════════════════════════════════
 * Renouvelle la session Supabase à chaque requête et renvoie l'utilisateur
 * vérifié + son niveau d'authentification (aal1 / aal2).
 *
 * ⚠ Le middleware est un confort de navigation (redirections), PAS la protection :
 *   la vraie barrière est la base (RLS + aal2) et chaque page serveur revérifie
 *   avec getUser() (revalidé par les serveurs Supabase), jamais getSession().
 * ═══════════════════════════════════════════════════════════════════
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@plateforme/types';

export async function rafraichirSession(requete: NextRequest) {
  // On commence avec une réponse "passe-plat" sans modification.
  let reponse = NextResponse.next({ request: requete });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => requete.cookies.getAll(),
        setAll: (aEcrire) => {
          // 1. Mettre à jour les cookies sur l'objet requête (pour la suite du middleware).
          aEcrire.forEach(({ name, value }) => requete.cookies.set(name, value));
          // 2. Recréer la réponse avec la requête mise à jour, puis y apposer les cookies.
          reponse = NextResponse.next({ request: requete });
          aEcrire.forEach(({ name, value, options }) => reponse.cookies.set(name, value, options));
        },
      },
    },
  );

  // getUser() revalide la session auprès des serveurs Supabase (jamais getSession()).
  const { data: { user } } = await supabase.auth.getUser();

  const { data: niveau } = user
    ? await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    : { data: null };

  return { supabase, reponse: () => reponse, utilisateur: user, niveau };
}
