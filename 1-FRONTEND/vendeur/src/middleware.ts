/**
 * Middleware Next.js — application vendeur (pro.)
 * Renouvelle la session et protège toutes les routes partenaire.
 * ⚠ Protection de confort uniquement : la vraie barrière est la RLS en base.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { rafraichirSession } from '@plateforme/supabase';

/** Routes publiques (ne nécessitent pas de session) */
const ROUTES_PUBLIQUES = ['/connexion', '/devenir-partenaire', '/auth/callback'];

export async function middleware(requete: NextRequest) {
  const { reponse, utilisateur } = await rafraichirSession(requete);
  const chemin = requete.nextUrl.pathname;

  const estPublique = ROUTES_PUBLIQUES.some((p) => chemin === p || chemin.startsWith(`${p}/`));

  // Toutes les routes sauf les publiques exigent une session
  if (!utilisateur && !estPublique) {
    const url = requete.nextUrl.clone();
    url.pathname = '/connexion';
    url.searchParams.set('suite', chemin);
    return NextResponse.redirect(url);
  }

  // Déjà connecté → ne pas rester sur les pages d'auth
  if (utilisateur && chemin === '/connexion') {
    const url = requete.nextUrl.clone();
    url.pathname = '/tableau-de-bord';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return reponse();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico)$).*)',
  ],
};
