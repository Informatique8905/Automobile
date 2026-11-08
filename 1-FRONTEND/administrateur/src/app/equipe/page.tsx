/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Équipe interne et rôles
 * Route : /equipe    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * DONNÉES
 *   • table user_roles
 *
 * SÉCURITÉ
 *   • Rôle admin uniquement
 *   • 2 administrateurs maximum au lancement
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
