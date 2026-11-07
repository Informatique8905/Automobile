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

export default async function Page({ params }: { params: Promise<{ vehicule: string }> }) {
  const { vehicule } = await params;
  return null; // À développer
}
