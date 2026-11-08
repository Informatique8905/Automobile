/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Ajouter un véhicule
 * Route : /flotte/nouveau    Application : vendeur (pro.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Marque, modèle, année, finition, carburant, boîte, places, kilométrage, agence de rattachement
 *   • Plaque et VIN (privés)
 *
 * DONNÉES
 *   • tables vehicles, vehicle_private
 *
 * SÉCURITÉ
 *   • Plaque et VIN jamais publics (vehicle_private)
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
