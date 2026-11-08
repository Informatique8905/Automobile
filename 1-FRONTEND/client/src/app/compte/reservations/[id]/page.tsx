/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Détail d'une réservation
 * Route : /compte/reservations/[id]    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Statut, QR code, contrat, facture certifiée
 *   • État des lieux départ / retour (photos, signature)
 *   • Annuler (politique appliquée par la base)
 *   • Prolonger
 *   • Signaler un incident (panne, accident, retard)
 *   • Laisser un avis
 *
 * DONNÉES
 *   • rpc cancel_booking
 *   • rpc sign_inspection
 *   • rpc submit_review
 *   • table disputes (création)
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
