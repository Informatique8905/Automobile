/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Profil public et agences
 * Route : /profil-public    Application : vendeur (pro.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Logo, couverture, description, agences / points de retrait (horaires, carte)
 *
 * DONNÉES
 *   • tables partners, partner_locations
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
