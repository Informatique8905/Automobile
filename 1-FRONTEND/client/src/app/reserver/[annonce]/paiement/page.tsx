/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Réservation — c) Récapitulatif détaillé et paiement
 * Route : /reserver/[annonce]/paiement    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CAHIER DES CHARGES
 *   Tunnel — c) Récapitulatif détaillé et paiement sécurisé
 *
 * CONTENU
 *   • Détail : location, assurance, options, frais de service, taxes, total
 *   • Caution : montant et mode (en agence / Mobile Money remboursable / empreinte carte)
 *   • Moyens Jeko : Wave, Orange Money, MTN MoMo, Moov Money, Djamo, carte, QR PI-SPI
 *   • Bouton « Payer » → redirection Jeko
 *
 * DONNÉES
 *   • rpc create_rental_booking (bloque le calendrier)
 *   • API POST /client/paiements/initier
 *
 * SÉCURITÉ
 *   • Aucun montant envoyé par le navigateur
 *   • Plafond Jeko dépassé → message AMOUNT_ABOVE_PROVIDER_LIMIT + contacter l'agence
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { clientServeur } from '@plateforme/supabase/serveur';
import { redirect } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ annonce: string }> }) {
  const supabase = await clientServeur();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/connexion');
  const { annonce } = await params;
  return null; // À développer
}
