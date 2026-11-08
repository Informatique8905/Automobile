/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Sécurité — journal des connexions
 * Route : /securite/journal    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * DONNÉES
 *   • table security_events
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
