/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Utilisateur — fiche
 * Route : /utilisateurs/[id]    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Sanctions (avertissement, suspension, bannissement)
 *   • Liste noire (valeurs hachées)
 *   • Signaux de fraude
 *
 * DONNÉES
 *   • tables user_sanctions, blocklist, fraud_signals
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return null; // À développer
}
