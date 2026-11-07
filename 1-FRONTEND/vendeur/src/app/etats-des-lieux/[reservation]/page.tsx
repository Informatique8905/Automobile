/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · État des lieux départ / retour
 * Route : /etats-des-lieux/[reservation]    Application : vendeur (pro.)
 * ═══════════════════════════════════════════════════════════════════════════
 * AJOUT — première source de litiges.
 *
 * CONTENU
 *   • Photos guidées par angle, horodatées et géolocalisées
 *   • Dommages existants (gravité)
 *   • Signature des deux parties
 *   • Retour : kilométrage, carburant, nouveaux dommages, rpc complete_booking
 *
 * DONNÉES
 *   • tables vehicle_inspections, inspection_photos, inspection_damages
 *   • API POST /vendeur/etats-des-lieux/photos
 *
 * SÉCURITÉ
 *   • Photos dans le bucket privé inspection-photos ; métadonnées de preuve conservées côté serveur
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export default async function Page({ params }: { params: Promise<{ reservation: string }> }) {
  const { reservation } = await params;
  return null; // À développer
}
