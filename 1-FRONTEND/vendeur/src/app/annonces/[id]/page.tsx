/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Éditeur d'annonce
 * Route : /annonces/[id]    Application : vendeur (pro.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CAHIER DES CHARGES
 *   Gestion de flotte — éditeur d'annonce fluide
 *
 * CONTENU
 *   • Prix (location : jour, remises semaine / mois ; vente : prix, négociable)
 *   • Photos glisser-déposer (angles imposés : avant, arrière, côtés, intérieur, tableau de bord)
 *   • Description
 *   • Conditions : caution, kilométrage, carburant, annulation, âge minimum, livraison, chauffeur
 *   • Options payantes
 *   • Tarifs saisonniers
 *   • Soumettre à la revue
 *
 * DONNÉES
 *   • tables listings, rental_terms, sale_terms, listing_extras, seasonal_prices
 *   • API POST /vendeur/photos (conversion WebP, empreinte anti-copie)
 *   • rpc submit_listing_for_review
 *
 * SÉCURITÉ
 *   • Un partenaire ne peut pas publier lui-même : revue IA + humaine
 *   • Un « agent » ne peut pas modifier les prix
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return null; // À développer
}
