/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Mes données personnelles
 * Route : /compte/mes-donnees    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * AJOUT — loi 2013-450.
 *
 * CONTENU
 *   • Télécharger mes données
 *   • Demander une rectification / m'opposer
 *   • Supprimer mon compte (30 jours de délai, puis anonymisation)
 *
 * DONNÉES
 *   • rpc request_privacy_action
 *   • rpc request_account_deletion / cancel_account_deletion
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
