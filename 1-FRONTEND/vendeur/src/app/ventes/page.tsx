/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Ventes : essais, acomptes, financements
 * Route : /ventes    Application : vendeur (pro.)
 * ═══════════════════════════════════════════════════════════════════════════
 * DONNÉES
 *   • tables test_drives, sale_reservations, financing_requests
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
