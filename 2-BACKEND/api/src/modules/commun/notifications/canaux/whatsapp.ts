/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CANAL · Canal whatsapp
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • WhatsApp Business Platform — modèles approuvés
 *
 * SÉCURITÉ
 *   • Clé du prestataire lue dans env, jamais journalisée
 *   • Ne jamais journaliser le contenu ni le destinataire
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export async function envoyerWhatsapp(_destinataire: string, _message: { titre: string; corps: string }): Promise<{ reference: string }> {
  throw new Error('À développer');
}
