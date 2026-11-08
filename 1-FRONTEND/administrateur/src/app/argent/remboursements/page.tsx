/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Remboursements
 * Route : /argent/remboursements    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * DONNÉES
 *   • table refunds
 *   • API POST /administrateur/remboursements
 *
 * SÉCURITÉ
 *   • Au-delà du seuil : validation par un 2ᵉ administrateur
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
