/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Paiements et factures
 * Route : /compte/factures    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CAHIER DES CHARGES
 *   Espace utilisateur — 4) Paiement et facturation
 *
 * CONTENU
 *   • Liste des paiements et remboursements
 *   • Factures certifiées FNE (référence + QR de certification)
 *
 * DONNÉES
 *   • tables payments, refunds, invoices (fne_status = certified)
 *   • API GET /client/factures/:id
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
