/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Détail d'une vente
 * Route : /ventes/[id]    Application : vendeur (pro.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Confirmer un essai, enregistrer la vente
 *
 * DONNÉES
 *   • rpc update_test_drive_status
 *   • rpc record_vehicle_sale
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return null; // À développer
}
