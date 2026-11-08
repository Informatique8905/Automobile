/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Mes alertes de recherche
 * Route : /compte/alertes    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * AJOUT (P2)
 *
 * DONNÉES
 *   • table saved_searches
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
