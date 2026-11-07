/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Réservation — a) Options et assurances
 * Route : /reserver/[annonce]/options    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CAHIER DES CHARGES
 *   Tunnel — a) Options et assurances
 *
 * CONTENU
 *   • Barre de progression a → d
 *   • Récapitulatif express : dates, lieux, visuel du véhicule
 *   • Formule d'assurance : RC incluse (obligatoire) / intermédiaire / tous risques
 *   • Options : siège enfant, GPS, conducteur supplémentaire, kilométrage, livraison domicile / hôtel / aéroport, chauffeur
 *
 * DONNÉES
 *   • rpc quote_rental (recalcul à chaque option)
 *   • tables insurance_plans, listing_extras
 *
 * SÉCURITÉ
 *   • La RC n'est pas décochable
 *   • Le prix affiché vient de la base, jamais d'un calcul local
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export default async function Page({ params }: { params: Promise<{ annonce: string }> }) {
  const { annonce } = await params;
  return null; // À développer
}
