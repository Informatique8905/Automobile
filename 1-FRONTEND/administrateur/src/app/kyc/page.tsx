/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Vérifications d'identité — file
 * Route : /kyc    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * DONNÉES
 *   • tables kyc_verifications, user_documents
 *
 * SÉCURITÉ
 *   • Rôle moderator
 *   • Double authentification obligatoire (proxy + base)
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
