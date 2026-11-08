/**
 * ROUTE · Callback OAuth / lien magique — application vendeur (pro.)
 * Échange le code PKCE contre une session, puis redirige vers /tableau-de-bord.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { clientServeur } from '@plateforme/supabase/serveur';

export async function GET(requete: NextRequest) {
  const { searchParams, origin } = requete.nextUrl;
  const code = searchParams.get('code');
  const suiteParam = searchParams.get('suite') ?? '';
  const suite = suiteParam.startsWith('/') ? suiteParam : '/tableau-de-bord';

  if (code) {
    const supabase = await clientServeur();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${suite}`);
    }
  }

  return NextResponse.redirect(`${origin}/connexion?erreur=callback`);
}
