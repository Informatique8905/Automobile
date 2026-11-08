/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Messagerie — conversation
 * Route : /compte/messages/[id]    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Fil temps réel, pièces jointes, bandeau « Ne payez jamais en dehors de la plateforme »
 *
 * DONNÉES
 *   • table messages (temps réel)
 *   • rpc mark_conversation_read
 *
 * SÉCURITÉ
 *   • Pré-filtre en base + agent IA : coordonnées et paiements hors plateforme signalés
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { clientServeur } from '@plateforme/supabase/serveur';
import { redirect } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await clientServeur();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/connexion');
  const { id } = await params;
  return null; // À développer
}
