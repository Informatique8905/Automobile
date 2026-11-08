/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Messagerie partenaire
 * Route : /messages    Application : vendeur (pro.)
 * ═══════════════════════════════════════════════════════════════════════════
 * DONNÉES
 *   • tables conversations, messages
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
