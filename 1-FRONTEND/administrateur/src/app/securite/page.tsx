/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Sécurité — tableau de bord
 * Route : /securite    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * AJOUT
 *
 * CONTENU
 *   • Voir 3-SECURITE/06-surveillance-et-alertes
 *
 * SÉCURITÉ
 *   • Rôle admin
 *   • Double authentification obligatoire (proxy + base)
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
