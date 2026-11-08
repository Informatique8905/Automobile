/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Mes annonces
 * Route : /annonces    Application : vendeur (pro.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Brouillon / en revue / publiée / en pause / vendue
 *   • Statistiques par annonce
 *
 * DONNÉES
 *   • table listings
 *   • table listing_stats_daily
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
