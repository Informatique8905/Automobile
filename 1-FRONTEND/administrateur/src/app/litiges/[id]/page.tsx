/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Litige — instruction et décision
 * Route : /litiges/[id]    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Pièces des deux parties, états des lieux, messages
 *   • Décision : client / partenaire / partage de la caution
 *
 * DONNÉES
 *   • tables disputes, dispute_evidence, vehicle_inspections
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
