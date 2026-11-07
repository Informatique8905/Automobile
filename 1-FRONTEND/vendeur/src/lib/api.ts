/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODULE · Appels à l'API Render (avec le jeton de l'utilisateur)
 * Application : vendeur
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • appelerApi(chemin, corps) : ajoute Authorization: Bearer <jeton Supabase>
 *   • Traduit les codes d'erreur via @plateforme/i18n
 *   • Délai d'attente 70 s (réveil possible de Render en offre gratuite) + message « Connexion au service de paiement… »
 *
 * SÉCURITÉ
 *   • Jamais de cookie vers l'API ; jamais de secret
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export async function appelerApi<T>(_chemin: string, _corps?: unknown): Promise<T> {
  throw new Error('À développer');
}
