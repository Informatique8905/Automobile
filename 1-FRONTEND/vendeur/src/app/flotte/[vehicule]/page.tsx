/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Fiche véhicule (partenaire)
 * Route : /flotte/[vehicule]    Application : vendeur (pro.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Documents du véhicule + dates d'expiration
 *   • Carnet d'entretien
 *   • Équipements
 *   • Historique des locations
 *
 * DONNÉES
 *   • tables vehicle_documents, vehicle_maintenance_logs, vehicle_equipment
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { clientServeur } from '@plateforme/supabase/serveur';
import { redirect } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ vehicule: string }> }) {
  const supabase = await clientServeur();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/connexion');
  const { vehicule } = await params;
  return null; // À développer
}
