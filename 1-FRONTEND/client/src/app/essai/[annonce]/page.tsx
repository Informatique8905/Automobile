/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Vente — réserver un essai
 * Route : /essai/[annonce]    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CAHIER DES CHARGES
 *   Cas vente — réservation d'un essai
 *
 * CONTENU
 *   • Date / heure, permis, confirmation
 *
 * DONNÉES
 *   • rpc request_test_drive
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { clientServeur } from '@plateforme/supabase/serveur';
import { redirect } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ annonce: string }> }) {
  const supabase = await clientServeur();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/connexion');
  const { annonce } = await params;
  return null; // À développer
}
