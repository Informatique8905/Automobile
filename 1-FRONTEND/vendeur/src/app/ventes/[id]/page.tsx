/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Détail d'une vente
 * Route : /ventes/[id]    Application : vendeur (pro.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Confirmer un essai, enregistrer la vente
 *
 * DONNÉES
 *   • rpc update_test_drive_status
 *   • rpc record_vehicle_sale
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
