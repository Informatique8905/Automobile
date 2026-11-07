/**
 * ═══════════════════════════════════════════════════════════════════
 * SESSION DANS LE PROXY NEXT.JS (src/proxy.ts de chaque application)
 * ═══════════════════════════════════════════════════════════════════
 * Renouvelle la session Supabase à chaque requête et renvoie l'utilisateur
 * vérifié + son niveau d'authentification (aal1 / aal2).
 * ⚠ Le proxy est un confort de navigation (redirections), PAS la protection :
 *   la vraie barrière est la base (RLS + aal2) et chaque page serveur revérifie.
 * ═══════════════════════════════════════════════════════════════════
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@plateforme/types';

export async function rafraichirSession(requete: NextRequest, entetes?: Headers) {
  let reponse = NextResponse.next({ request: { headers: entetes ?? requete.headers } });
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => requete.cookies.getAll(),
        setAll: (aEcrire) => {
          aEcrire.forEach(({ name, value }) => requete.cookies.set(name, value));
          reponse = NextResponse.next({ request: { headers: entetes ?? requete.headers } });
          aEcrire.forEach(({ name, value, options }) => reponse.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { data: niveau } = user
    ? await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    : { data: null };

  return { supabase, reponse: () => reponse, utilisateur: user, niveau };
}
