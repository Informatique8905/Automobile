/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Tableau de bord de l'équipe
 * Route : /    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Files en attente (KYC, annonces, signalements, litiges, tickets)
 *   • Argent du jour
 *   • Alertes de sécurité
 *
 * SÉCURITÉ
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
