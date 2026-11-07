/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ROUTE · Retour de Google / Apple / lien e-mail
 * Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Échange le code contre une session (cookie httpOnly), puis redirige
 *
 * SÉCURITÉ
 *   • Redirection seulement vers un chemin interne (pas d'URL externe dans « next »)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export async function GET(_request: Request) {
  // À développer : exchangeCodeForSession puis redirection interne
  return new Response(null, { status: 302, headers: { Location: '/' } });
}
