/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Demandes « vie privée »
 * Route : /securite/vie-privee    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * AJOUT — loi 2013-450.
 *
 * DONNÉES
 *   • table privacy_requests
 *   • API POST /administrateur/mes-donnees/:id/export
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
