/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CANAL · Canal push
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Notifications push Web (PWA)
 *
 * SÉCURITÉ
 *   • Clé du prestataire lue dans env, jamais journalisée
 *   • Ne jamais journaliser le contenu ni le destinataire
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export async function envoyerPush(_destinataire: string, _message: { titre: string; corps: string }): Promise<{ reference: string }> {
  throw new Error('À développer');
}
