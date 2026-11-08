/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODULE · Plan du site pour Google
 * Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Pages fixes + pages ville/catégorie + annonces publiées (rpc search_listings, paginé)
 *
 * À FAIRE
 *   [ ] Générer par lots de 5 000 URL si le catalogue grossit
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return []; // À développer
}
