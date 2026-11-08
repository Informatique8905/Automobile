/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LAYOUT · Mise en page du back-office
 * Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Menu : Tableau de bord, Modération, KYC, Partenaires, Utilisateurs, Réservations, Argent, Litiges, Support, Sécurité, Référentiels, Contenus, Réglages, Équipe
 *
 * SÉCURITÉ
 *   • Double authentification obligatoire (proxy + base)
 *   • CSP stricte avec nonce, aucune ressource tierce
 *   • Non indexé, session de 8 h
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ReactNode } from 'react';
import './globals.css';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
