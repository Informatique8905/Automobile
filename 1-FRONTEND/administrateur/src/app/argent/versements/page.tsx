/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Versements aux partenaires
 * Route : /argent/versements    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * DONNÉES
 *   • tables payouts, payout_items
 *   • API POST /administrateur/versements/lot
 *
 * SÉCURITÉ
 *   • Refusé vers un compte en période de carence (PAYOUT_ACCOUNT_COOLING_PERIOD)
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
