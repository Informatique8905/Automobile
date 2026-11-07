/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Versements et comptes de versement
 * Route : /versements    Application : vendeur (pro.)
 * ═══════════════════════════════════════════════════════════════════════════
 * AJOUT — protégé contre le détournement.
 *
 * CONTENU
 *   • Comptes (4 derniers chiffres, « utilisable à partir du… »)
 *   • Historique des versements et commissions
 *
 * DONNÉES
 *   • tables partner_payout_accounts, payouts, payout_items
 *   • API POST /vendeur/versements/comptes
 *
 * SÉCURITÉ
 *   • Ajout de compte : délai de 72 h + alerte e-mail + contrôle IA
 *   • Numéro chiffré par l'API avant écriture (owner / manager uniquement)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export default function Page() {
  return null; // À développer
}
