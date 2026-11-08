/**
 * ROUTE · Callback lien magique — application administrateur (admin.)
 * L'admin ne se connecte pas via OAuth mais le lien e-mail passe par ici.
 * Après l'échange de code, le middleware vérifie l'aal2 et redirige si besoin.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { clientServeur } from '@plateforme/supabase/serveur';

export async function GET(requete: NextRequest) {
  const { searchParams, origin } = requete.nextUrl;
  const code = searchParams.get('code');

  if (code) {
    const supabase = await clientServeur();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // Le proxy se chargera de vérifier aal2 et de rediriger vers /activer-2fa ou /connexion
    if (!error) {
      return NextResponse.redirect(`${origin}/tableau-de-bord`);
    }
  }

  return NextResponse.redirect(`${origin}/connexion?erreur=callback`);
}
