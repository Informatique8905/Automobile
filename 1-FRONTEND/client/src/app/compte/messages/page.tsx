/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Messagerie — boîte de réception
 * Route : /compte/messages    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CAHIER DES CHARGES
 *   Espace utilisateur — 3) Messagerie contextuelle
 *
 * CONTENU
 *   • Boîte unique, chaque conversation rattachée à une annonce / réservation / essai
 *
 * DONNÉES
 *   • table conversations
 *   • table conversation_reads
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
