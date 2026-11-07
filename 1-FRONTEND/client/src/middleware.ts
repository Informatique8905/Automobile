/**
 * Middleware Next.js — application client (www.)
 * Renouvelle la session Supabase et redirige vers /connexion si nécessaire.
 * ⚠ Protection de confort uniquement : la vraie barrière est la RLS en base.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { rafraichirSession } from '@plateforme/supabase';

/** Routes qui exigent une session active */
const ROUTES_PRIVEES = [
  '/compte',
  '/reserver',
  '/reservation',
  '/essai',
  '/acompte',
  '/paiement',
];

export async function middleware(requete: NextRequest) {
  const { reponse, utilisateur } = await rafraichirSession(requete);
  const chemin = requete.nextUrl.pathname;

  // Rediriger vers /connexion si la route est privée et l'utilisateur absent
  if (!utilisateur && ROUTES_PRIVEES.some((p) => chemin === p || chemin.startsWith(`${p}/`))) {
    const url = requete.nextUrl.clone();
    url.pathname = '/connexion';
    url.searchParams.set('suite', chemin);
    return NextResponse.redirect(url);
  }

  // Rediriger vers /compte si déjà connecté et sur une page d'auth
  if (utilisateur && (chemin === '/connexion' || chemin === '/inscription')) {
    const url = requete.nextUrl.clone();
    url.pathname = '/compte';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return reponse();
}

export const config = {
  matcher: [
    // Exclure les assets statiques, images, et routes spéciales Next.js
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico)$).*)',
  ],
};
