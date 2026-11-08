/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Vente — acompte de réservation
 * Route : /acompte/[annonce]    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CAHIER DES CHARGES
 *   Cas vente — acompte de réservation (achat)
 *
 * CONTENU
 *   • Montant de l'acompte, durée de réservation du véhicule, conditions de remboursement (arrhes)
 *
 * DONNÉES
 *   • rpc create_sale_reservation
 *   • API POST /client/paiements/initier
 *
 * À FAIRE
 *   [ ] Au lancement : désactivé si la concession encaisse elle-même (voir AJOUTS_CAHIER_DES_CHARGES.md)
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
