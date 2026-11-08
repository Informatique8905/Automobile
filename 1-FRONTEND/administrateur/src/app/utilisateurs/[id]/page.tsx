/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Utilisateur — fiche
 * Route : /utilisateurs/[id]    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Sanctions (avertissement, suspension, bannissement)
 *   • Liste noire (valeurs hachées)
 *   • Signaux de fraude
 *
 * DONNÉES
 *   • tables user_sanctions, blocklist, fraud_signals
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { clientServeur } from '@plateforme/supabase/serveur';
import { redirect } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await clientServeur();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/connexion');
  const { id } = await params;
  return null; // À développer
}
