/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Mon équipe
 * Route : /equipe    Application : vendeur (pro.)
 * ═══════════════════════════════════════════════════════════════════════════
 * AJOUT
 *
 * CONTENU
 *   • Inviter par e-mail, rôles owner / manager / agent
 *
 * DONNÉES
 *   • rpc invite_partner_member
 *   • table partner_members
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
