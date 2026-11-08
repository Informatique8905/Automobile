/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Vérification d'identité — décision
 * Route : /kyc/[id]    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Documents (lien signé 5 min, filigrane « usage interne »)
 *   • Pré-contrôle IA (indicatif)
 *   • Valider / refuser avec motif
 *
 * DONNÉES
 *   • API GET /administrateur/documents/:id/lien (accès journalisé)
 *   • rpc decide_kyc
 *   • rpc review_user_document
 *
 * SÉCURITÉ
 *   • Chaque consultation est journalisée (audit_logs)
 *   • Aucune capture, aucun téléchargement local
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
