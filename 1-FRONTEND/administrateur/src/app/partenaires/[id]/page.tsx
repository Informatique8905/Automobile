/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Partenaire — validation KYB
 * Route : /partenaires/[id]    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * DONNÉES
 *   • rpc verify_partner
 *   • table partner_documents
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
