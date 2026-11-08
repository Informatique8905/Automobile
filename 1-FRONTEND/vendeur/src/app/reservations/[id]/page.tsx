/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Détail d'une réservation (partenaire)
 * Route : /reservations/[id]    Application : vendeur (pro.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Accepter / refuser
 *   • Conducteur : statut KYC (pas l'image du document)
 *   • Contrat, facture
 *   • Litige éventuel
 *
 * DONNÉES
 *   • rpc respond_to_booking
 *   • rpc get_booking_contacts
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
