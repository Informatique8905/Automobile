/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PROXY (Next.js 16, anciennement « middleware ») · application client
 * ═══════════════════════════════════════════════════════════════════════════
 * - Renouvelle la session Supabase à chaque requête.
 * - Redirige vers /connexion les pages qui exigent un compte.
 * ⚠ Confort de navigation seulement : la protection réelle est dans la base
 *   (RLS) et chaque page serveur revérifie l'utilisateur avec getUser().
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { NextResponse, type NextRequest } from 'next/server';
import { rafraichirSession } from '@plateforme/supabase';

const PAGES_AVEC_COMPTE = ['/compte', '/reserver', '/reservation', '/essai', '/acompte'];

export async function proxy(requete: NextRequest) {
  const { reponse, utilisateur } = await rafraichirSession(requete);
  const chemin = requete.nextUrl.pathname;

  if (!utilisateur && PAGES_AVEC_COMPTE.some((p) => chemin === p || chemin.startsWith(`${p}/`))) {
    const url = requete.nextUrl.clone();
    url.pathname = '/connexion';
    url.search = '';
    url.searchParams.set('suite', chemin); // chemin interne uniquement (revérifié après connexion)
    return NextResponse.redirect(url);
  }
  return reponse();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico)$).*)'],
};
