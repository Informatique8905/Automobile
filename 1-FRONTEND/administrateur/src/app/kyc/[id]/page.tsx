/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Vérification d'identité — décision
 * Route : /kyc/[id]    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Documents (lien signé 5 min, filigrane « usage interne »)
 *   • Pré-contrôle IA (indicatif)
 *   • Valider / refuser avec motif
 *
 * DONNÉES
 *   • API GET /administrateur/documents/:id/lien (accès journalisé)
 *   • rpc decide_kyc
 *   • rpc review_user_document
 *
 * SÉCURITÉ
 *   • Chaque consultation est journalisée (audit_logs)
 *   • Aucune capture, aucun téléchargement local
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return null; // À développer
}
