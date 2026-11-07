/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PROXY (Next.js 16) · application vendeur
 * ═══════════════════════════════════════════════════════════════════════════
 * Tout l'espace partenaire exige un compte, sauf la page de connexion.
 * L'appartenance à une agence et le rôle (owner / manager / agent) sont
 * vérifiés par la base ; la mise en page serveur redirige vers
 * /devenir-partenaire si l'utilisateur n'est membre d'aucun partenaire.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { NextResponse, type NextRequest } from 'next/server';
import { rafraichirSession } from '@plateforme/supabase';

const PAGES_LIBRES = ['/connexion'];

export async function proxy(requete: NextRequest) {
  const { reponse, utilisateur } = await rafraichirSession(requete);
  if (!utilisateur && !PAGES_LIBRES.includes(requete.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/connexion', requete.url));
  }
  return reponse();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico)$).*)'],
};
