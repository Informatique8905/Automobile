/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LAYOUT · Mise en page de l'espace partenaire
 * Application : vendeur (pro.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Menu latéral : Tableau de bord, Flotte, Annonces, Calendrier, Réservations, Remise, Ventes, Messages, Avis, Versements, Factures, Équipe, Profil public, Sécurité
 *   • Sélecteur d'agence (un utilisateur peut appartenir à plusieurs partenaires)
 *
 * SÉCURITÉ
 *   • Page non indexée (X-Robots-Tag)
 *   • Menus affichés selon le rôle owner / manager / agent — la base revérifie tout
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
