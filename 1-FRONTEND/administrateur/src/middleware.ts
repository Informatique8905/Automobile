/**
 * Middleware Next.js — application administrateur (admin.)
 * Protection renforcée : exige aal2 (session avec TOTP validé) sur toutes les routes
 * sauf /connexion et /auth/callback.
 * ⚠ Protection de confort uniquement : la vraie barrière est la RLS en base.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { rafraichirSession } from '@plateforme/supabase';

const ROUTES_PUBLIQUES = ['/connexion', '/auth/callback'];

export async function middleware(requete: NextRequest) {
  const { reponse, utilisateur, niveau } = await rafraichirSession(requete);
  const chemin = requete.nextUrl.pathname;

  const estPublique = ROUTES_PUBLIQUES.some((p) => chemin === p || chemin.startsWith(`${p}/`));

  if (estPublique) return reponse();

  // Pas de session → connexion
  if (!utilisateur) {
    const url = requete.nextUrl.clone();
    url.pathname = '/connexion';
    url.searchParams.set('suite', chemin);
    return NextResponse.redirect(url);
  }

  // Session aal1 mais aal2 requis → retour connexion pour TOTP
  const niveauActuel = niveau?.currentLevel;
  const niveauSuivant = niveau?.nextLevel;
  if (niveauSuivant === 'aal2' && niveauActuel !== 'aal2') {
    const url = requete.nextUrl.clone();
    url.pathname = '/connexion';
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
