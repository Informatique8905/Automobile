/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Réservation — b) Conducteur et vérification d'identité
 * Route : /reserver/[annonce]/conducteur    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CAHIER DES CHARGES
 *   Tunnel — b) Conducteur et vérification d'identité (KYC)
 *
 * CONTENU
 *   • Documents déjà validés ? → étape suivante
 *   • Sinon : photo du permis recto/verso + pièce d'identité + selfie (fournisseur KYC)
 *   • Conducteur supplémentaire : mêmes vérifications
 *   • Consentement « traitement biométrique » explicite
 *
 * DONNÉES
 *   • API POST /client/kyc/session
 *   • table user_documents (coffre-fort)
 *   • table consents (biometric_processing)
 *
 * SÉCURITÉ
 *   • Envoi direct vers le bucket PRIVÉ kyc-documents (URL signée)
 *   • L'IA pré-contrôle, un humain décide (decide_kyc)
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
