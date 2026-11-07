/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODULE · robots.txt
 * Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Autorise les pages publiques, interdit /compte, /reserver, /paiement
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/compte', '/reserver', '/paiement', '/auth'] }] };
}
