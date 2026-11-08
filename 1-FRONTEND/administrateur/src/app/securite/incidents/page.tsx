/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Sécurité — registre des violations de données
 * Route : /securite/incidents    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * AJOUT — obligation ARTCI.
 *
 * DONNÉES
 *   • table data_incidents
 *
 * SÉCURITÉ
 *   • Rôle admin uniquement
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
