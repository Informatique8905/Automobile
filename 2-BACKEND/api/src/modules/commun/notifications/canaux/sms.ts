/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CANAL · Canal sms
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • SMS (codes, rappels) — nom d'expéditeur enregistré auprès des opérateurs
 *
 * SÉCURITÉ
 *   • Clé du prestataire lue dans env, jamais journalisée
 *   • Ne jamais journaliser le contenu ni le destinataire
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export async function envoyerSms(_destinataire: string, _message: { titre: string; corps: string }): Promise<{ reference: string }> {
  throw new Error('À développer');
}
