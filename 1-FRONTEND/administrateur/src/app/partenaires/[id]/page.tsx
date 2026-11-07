/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Partenaire — validation KYB
 * Route : /partenaires/[id]    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * DONNÉES
 *   • rpc verify_partner
 *   • table partner_documents
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return null; // À développer
}
