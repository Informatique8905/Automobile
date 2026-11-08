/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Tableau de bord business
 * Route : /tableau-de-bord    Application : vendeur (pro.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CAHIER DES CHARGES
 *   Espace partenaire — 1) Tableau de bord business
 *
 * CONTENU
 *   • Indicateurs clés : revenus, taux d'occupation, réservations, note, taux de réponse (filtres date + catégorie)
 *   • To-do list automatisée : demandes à accepter, remises du jour, documents expirants, avis à répondre
 *
 * DONNÉES
 *   • rpc get_partner_kpis
 *   • rpc get_partner_revenue_series
 *   • rpc get_partner_todos
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
