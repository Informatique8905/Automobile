/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PROXY (Next.js 16) · back-office — double authentification OBLIGATOIRE
 * ═══════════════════════════════════════════════════════════════════════════
 * 1. CSP stricte avec un nonce neuf à chaque requête (aucun script non signé).
 * 2. Pas connecté                         → /connexion
 * 3. Aucun second facteur enregistré      → /activer-2fa
 * 4. Second facteur non saisi (aal1)      → /verification
 * 5. Sinon : accès. Le rôle (admin / moderator / support) est vérifié par la
 *    base : sans session « aal2 », la base ne reconnaît AUCUN droit d'équipe,
 *    même si quelqu'un contournait ce proxy.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { NextResponse, type NextRequest } from 'next/server';
import { rafraichirSession } from '@plateforme/supabase';
import { construireCsp } from '@plateforme/securite-applicative';

const PAGES_SANS_SESSION = ['/connexion'];

export async function proxy(requete: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = construireCsp('administrateur', {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    apiUrl: process.env.NEXT_PUBLIC_API_URL ?? '',
    nonce,
  });
  const entetes = new Headers(requete.headers);
  entetes.set('x-nonce', nonce); // lu par la mise en page pour signer ses scripts
  entetes.set('Content-Security-Policy', csp);

  const { reponse, utilisateur, niveau } = await rafraichirSession(requete, entetes);
  const chemin = requete.nextUrl.pathname;

  let cible: string | null = null;
  if (!utilisateur) {
    if (!PAGES_SANS_SESSION.includes(chemin)) cible = '/connexion';
  } else if (niveau?.nextLevel === 'aal1') {
    if (chemin !== '/activer-2fa') cible = '/activer-2fa';
  } else if (niveau?.currentLevel !== 'aal2') {
    if (chemin !== '/verification') cible = '/verification';
  }

  const r = cible ? NextResponse.redirect(new URL(cible, requete.url)) : reponse();
  r.headers.set('Content-Security-Policy', csp);
  r.headers.set('Cache-Control', 'no-store');
  return r;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
