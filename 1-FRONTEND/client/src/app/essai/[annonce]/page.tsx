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

export default async function Page({ params }: { params: Promise<{ annonce: string }> }) {
  const { annonce } = await params;
  return null; // À développer
}
