/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODULE · Manifeste PWA (application installable)
 * Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Nom, icônes, couleur, écran de démarrage
 *   • Permet « Ajouter à l'écran d'accueil » sur Android
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return { name: 'Plateforme Véhicules', short_name: 'Véhicules', start_url: '/', display: 'standalone', lang: 'fr' };
}
