/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Litige — instruction et décision
 * Route : /litiges/[id]    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Pièces des deux parties, états des lieux, messages
 *   • Décision : client / partenaire / partage de la caution
 *
 * DONNÉES
 *   • tables disputes, dispute_evidence, vehicle_inspections
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return null; // À développer
}
