/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Référentiels
 * Route : /referentiels    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Villes, communes, catégories, marques, modèles, équipements, options, formules d'assurance
 *
 * DONNÉES
 *   • tables cities, districts, vehicle_categories, vehicle_makes, vehicle_models, equipment, extras, insurance_plans
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
