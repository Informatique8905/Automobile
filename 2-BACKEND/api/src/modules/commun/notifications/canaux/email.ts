/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CANAL · Canal email
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • E-mail transactionnel par API HTTP (Resend, Brevo…)
 *
 * SÉCURITÉ
 *   • Clé du prestataire lue dans env, jamais journalisée
 *   • Ne jamais journaliser le contenu ni le destinataire
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export async function envoyerEmail(_destinataire: string, _message: { titre: string; corps: string }): Promise<{ reference: string }> {
  throw new Error('À développer');
}
