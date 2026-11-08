/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Réservation — d) Confirmation
 * Route : /reservation/[reference]/confirmation    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CAHIER DES CHARGES
 *   Tunnel — d) Confirmation et post-achat immédiat
 *
 * CONTENU
 *   • Numéro de réservation + QR code de prise en charge
 *   • Contrat PDF téléchargeable (envoyé aussi par e-mail)
 *   • Itinéraire vers le point de retrait
 *   • Contacter l'agence (coordonnées révélées après confirmation)
 *   • Ajouter au calendrier, partager sur WhatsApp
 *
 * DONNÉES
 *   • table bookings
 *   • rpc get_booking_contacts
 *   • API GET /client/contrats/:reservation
 *
 * SÉCURITÉ
 *   • QR code = jeton à usage unique (pickup_qr_token), jamais l'identifiant de la réservation
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { clientServeur } from '@plateforme/supabase/serveur';
import { redirect } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ reference: string }> }) {
  const supabase = await clientServeur();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/connexion');
  const { reference } = await params;
  return null; // À développer
}
