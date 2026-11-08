/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Réglages de la plateforme
 * Route : /reglages    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • TVA, frais de service, commission, délais, plafond Jeko, carence des versements…
 *
 * DONNÉES
 *   • table platform_settings
 *
 * SÉCURITÉ
 *   • Rôle admin uniquement, chaque modification auditée
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { clientServeur } from '@plateforme/supabase/serveur';
import { redirect } from 'next/navigation';

export default async function Page() {
  const supabase = await clientServeur();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/connexion');
  return null; // À développer
}
