/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Gestion de flotte
 * Route : /flotte    Application : vendeur (pro.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CAHIER DES CHARGES
 *   Espace partenaire — 2) Gestion de flotte
 *
 * CONTENU
 *   • Statut en temps réel : disponible, loué, en maintenance, hors service
 *   • Alertes documents (assurance, visite technique, carte grise)
 *
 * DONNÉES
 *   • table vehicles (fleet_status)
 *   • table vehicle_documents
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
