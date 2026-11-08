/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Espace client — tableau de bord
 * Route : /compte    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CAHIER DES CHARGES
 *   Espace utilisateur — 1) Tableau de bord
 *
 * CONTENU
 *   • Rappels contextuels (smart cards) : documents à fournir, remise demain, avis à laisser
 *   • Historique des activités
 *
 * DONNÉES
 *   • rpc get_my_reminders
 *   • tables bookings, test_drives, sale_reservations
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
