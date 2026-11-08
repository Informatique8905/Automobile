/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Sécurité du compte
 * Route : /compte/securite    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * AJOUT — normes internationales (2FA).
 *
 * CONTENU
 *   • Double authentification (activer / désactiver)
 *   • Appareils et sessions actives (déconnecter partout)
 *   • Historique des connexions
 *   • Changer de mot de passe
 *
 * DONNÉES
 *   • Supabase Auth mfa.*
 *   • table security_events (les siennes)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { clientServeur } from '@plateforme/supabase/serveur';
import { redirect } from 'next/navigation';

export default async function Page() {
  const supabase = await clientServeur();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/connexion');
  return null; // À développer
}
