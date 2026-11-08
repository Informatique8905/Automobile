/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Journal d'audit
 * Route : /securite/audit    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * DONNÉES
 *   • table audit_logs (lecture seule, inviolable)
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
