/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Réservations reçues
 * Route : /reservations    Application : vendeur (pro.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • À accepter (délai 24 h), confirmées, en cours, terminées
 *
 * DONNÉES
 *   • table bookings
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
