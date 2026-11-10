/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Modération — annonces
 * Route : /moderation/annonces    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * DONNÉES
 *   • rpc moderate_listing
 *   • rpc certify_sale_listing
 *
 * SÉCURITÉ
 *   • Rôle moderator ou admin
 *   • Double authentification obligatoire (proxy + base)
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
