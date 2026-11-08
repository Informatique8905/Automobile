/**
 * ROUTE · Callback OAuth / lien magique — application client (www.)
 * Échange le code PKCE contre une session, puis redirige vers le paramètre
 * « suite » ou vers /compte. Ne redirige jamais vers une URL externe.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { clientServeur } from '@plateforme/supabase/serveur';

export async function GET(requete: NextRequest) {
  const { searchParams, origin } = requete.nextUrl;
  const code = searchParams.get('code');
  // Chemin interne uniquement : on rejette tout ce qui commence par http
  const suiteParam = searchParams.get('suite') ?? '';
  const suite = suiteParam.startsWith('/') ? suiteParam : '/compte';

  if (code) {
    const supabase = await clientServeur();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${suite}`);
    }
  }

  // Échec → retour connexion avec indicateur d'erreur
  return NextResponse.redirect(`${origin}/connexion?erreur=callback`);
}
