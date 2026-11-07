/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Page référencée « Location de voiture à [ville] »
 * Route : /location-voiture/abidjan    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * AJOUT — acquisition gratuite par Google (« location voiture Cocody »).
 *
 * CONTENU
 *   • Titre et texte propres à la ville / commune
 *   • Annonces de location disponibles
 *   • FAQ locale
 *
 * DONNÉES
 *   • table cities / districts
 *   • rpc search_listings
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export default async function Page({ params }: { params: Promise<{ ville: string }> }) {
  const { ville } = await params;
  return null; // À développer
}
