/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Calendrier de disponibilité
 * Route : /calendrier    Application : vendeur (pro.)
 * ═══════════════════════════════════════════════════════════════════════════
 * AJOUT
 *
 * CONTENU
 *   • Vue par véhicule, blocages manuels (entretien, usage personnel)
 *
 * DONNÉES
 *   • table availability_blocks
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
