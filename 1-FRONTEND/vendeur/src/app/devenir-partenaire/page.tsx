/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Devenir partenaire (inscription KYB)
 * Route : /devenir-partenaire    Application : vendeur (pro.)
 * ═══════════════════════════════════════════════════════════════════════════
 * AJOUT — porte d'entrée de l'espace partenaire.
 *
 * CONTENU
 *   • 1. Type : agence de location, particulier loueur, concessionnaire, particulier vendeur
 *   • 2. Identité légale : raison sociale, RCCM, NCC (obligatoires pour les professionnels)
 *   • 3. Documents : RCCM, CNI du gérant, attestation d'assurance
 *   • 4. Compte de versement (utilisable 72 h après ajout)
 *   • 5. Suivi de validation
 *
 * DONNÉES
 *   • rpc become_partner
 *   • tables partner_private, partner_documents (bucket privé)
 *   • API POST /vendeur/versements/comptes (chiffrement)
 *
 * SÉCURITÉ
 *   • Badge « Vérifié » seulement après verify_partner par la modération
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export default function Page() {
  return null; // À développer
}
