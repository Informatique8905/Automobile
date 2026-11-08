/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Saisie du code TOTP
 * Route : /verification    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * DONNÉES
 *   • Supabase Auth mfa.challenge / mfa.verify
 *   • rpc staff_mfa_status
 *
 * SÉCURITÉ
 *   • Sans ce code, la base traite la personne comme un simple client
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
