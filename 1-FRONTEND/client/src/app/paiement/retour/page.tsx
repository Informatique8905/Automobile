/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Retour de la page de paiement Jeko
 * Route : /paiement/retour?ref=…    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * La présence de cette page ne prouve PAS le paiement : seule la base (webhook signé) fait foi.
 *
 * CONTENU
 *   • « Vérification de votre paiement… » puis redirection vers la confirmation
 *
 * DONNÉES
 *   • table payments (statut, interrogé toutes les 3 s pendant 60 s, puis abonnement temps réel)
 *
 * SÉCURITÉ
 *   • Ignorer tout paramètre « status=success » de l'URL
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
