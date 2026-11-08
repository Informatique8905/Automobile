/**
 * Middleware Next.js — application administrateur (admin.)
 * Protection renforcée : exige aal2 (session avec TOTP validé) sur toutes les routes
 * sauf /connexion et /auth/callback.
 *
 * Logique aal :
 *   nextLevel === 'aal1'  → aucun facteur TOTP enrôlé → /activer-2fa
 *   nextLevel === 'aal2' && currentLevel !== 'aal2' → facteur présent, non vérifié → /connexion
 *   currentLevel === 'aal2' → accès autorisé
 *
 * ⚠ Protection de confort uniquement : la vraie barrière est la RLS en base.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { rafraichirSession } from '@plateforme/supabase';

const ROUTES_PUBLIQUES = ['/connexion', '/auth/callback'];

export async function proxy(requete: NextRequest) {
  const { reponse, utilisateur, niveau } = await rafraichirSession(requete);
  const chemin = requete.nextUrl.pathname;

  // Routes entièrement publiques
  const estPublique = ROUTES_PUBLIQUES.some((p) => chemin === p || chemin.startsWith(`${p}/`));
  if (estPublique) return reponse();

  // Pas de session → connexion
  if (!utilisateur) {
    const url = requete.nextUrl.clone();
    url.pathname = '/connexion';
    url.searchParams.set('suite', chemin);
    return NextResponse.redirect(url);
  }

  const niveauActuel = niveau?.currentLevel ?? 'aal1';
  const niveauSuivant = niveau?.nextLevel ?? 'aal1';

  // Page d'activation TOTP : accessible si l'utilisateur n'a pas encore de facteur (aal1 max)
  const estActivation2FA = chemin === '/activer-2fa' || chemin.startsWith('/activer-2fa/');
  if (estActivation2FA) {
    // Déjà aal2 → pas besoin d'activer, rediriger vers le tableau de bord
    if (niveauActuel === 'aal2') {
      const url = requete.nextUrl.clone();
      url.pathname = '/tableau-de-bord';
      url.search = '';
      return NextResponse.redirect(url);
    }
    return reponse();
  }

  // Routes protégées → aal2 obligatoire
  if (niveauSuivant === 'aal1') {
    // Aucun facteur TOTP enrôlé → page d'activation
    const url = requete.nextUrl.clone();
    url.pathname = '/activer-2fa';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (niveauActuel !== 'aal2') {
    // Facteur enrôlé mais non vérifié dans cette session → TOTP requis
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
