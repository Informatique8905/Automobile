/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LAYOUT · Mise en page racine
 * Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • <html lang="fr">, police, couleurs (commun/ui/jetons.css)
 *   • Barre de navigation supérieure + pied de page
 *   • Bandeau de consentement cookies (aucune mesure d'audience avant accord)
 *   • Fournisseurs : session Supabase, notifications toast
 *   • Métadonnées par défaut (titre, description, Open Graph pour le partage WhatsApp)
 *
 * SÉCURITÉ
 *   • Aucun secret : seules NEXT_PUBLIC_SUPABASE_URL / PUBLISHABLE_KEY / API_URL
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
