/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Vérification et documents (coffre-fort)
 * Route : /compte/documents    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CAHIER DES CHARGES
 *   Espace utilisateur — 2) Section « Vérification et Docs »
 *
 * CONTENU
 *   • Statut : en attente / validé / refusé (motif)
 *   • Permis recto/verso, pièce d'identité
 *   • Date d'expiration et rappel
 *
 * DONNÉES
 *   • table user_documents
 *   • bucket privé kyc-documents (URL signées, 5 min)
 *
 * SÉCURITÉ
 *   • Le client voit ses documents, jamais ceux des autres (RLS + règles de stockage)
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
