/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Mon profil
 * Route : /compte/profil    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * DONNÉES
 *   • table profiles (colonnes modifiables uniquement)
 *
 * SÉCURITÉ
 *   • Date de naissance verrouillée après KYC (DOB_LOCKED_AFTER_KYC)
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
