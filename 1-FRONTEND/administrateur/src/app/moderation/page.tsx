/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Modération — file unifiée
 * Route : /moderation    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * DONNÉES
 *   • table moderation_flags
 *   • rpc resolve_flag
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
