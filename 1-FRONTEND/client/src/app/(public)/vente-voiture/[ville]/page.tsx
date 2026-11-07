/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Page référencée « Voitures à vendre à [ville] »
 * Route : /vente-voiture/abidjan    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * AJOUT — acquisition gratuite par Google.
 *
 * DONNÉES
 *   • table cities
 *   • rpc search_listings (type sale)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export default async function Page({ params }: { params: Promise<{ ville: string }> }) {
  const { ville } = await params;
  return null; // À développer
}
