/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Documents légaux
 * Route : /legal/cgu | confidentialite | cookies | mentions    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Conditions générales, politique de confidentialité (loi 2013-450), cookies, mentions légales — version en vigueur
 *
 * DONNÉES
 *   • table legal_documents
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export default async function Page({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params;
  return null; // À développer
}
