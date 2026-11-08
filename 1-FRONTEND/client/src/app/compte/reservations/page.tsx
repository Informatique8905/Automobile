/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Mes réservations
 * Route : /compte/reservations    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * DONNÉES
 *   • table bookings (RLS : les siennes)
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
