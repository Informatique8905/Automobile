/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Remise du véhicule (scanner le QR code)
 * Route : /remise    Application : vendeur (pro.)
 * ═══════════════════════════════════════════════════════════════════════════
 * AJOUT
 *
 * CONTENU
 *   • Caméra → scan du QR code du client
 *   • Relevé du kilométrage et du carburant
 *   • Démarre l'état des lieux de départ
 *
 * DONNÉES
 *   • rpc start_booking (refusé si permis non vérifié)
 *
 * SÉCURITÉ
 *   • QR code à usage unique ; vérification KYC par la base
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
