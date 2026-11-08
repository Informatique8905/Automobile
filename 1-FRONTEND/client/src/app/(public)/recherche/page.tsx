/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Catalogue (résultats de recherche)
 * Route : /recherche    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CAHIER DES CHARGES
 *   Page catalogue — barre supérieure, filtres rapides, filtres avancés, cartes, tri
 *
 * CONTENU
 *   • Rappel du contexte : lieu + dates (location) ou type d'achat
 *   • Filtres « pilules » (chips) les plus demandés
 *   • Panneau de filtres avancés : mode, budget (curseur double), ville + rayon, marque, modèle, année, carburant, boîte, places, type de vendeur, livraison, siège bébé, animaux, avec chauffeur, garanti / certifié
 *   • Commutateur liste / carte (desktop : liste à gauche, carte à droite ; mobile : bouton flottant)
 *   • Tri : pertinence, prix ↑↓, kilométrage, distance, note
 *   • Comparateur (2 ou 3 véhicules)
 *   • Zéro résultat : réinitialiser + véhicules similaires
 *
 * DONNÉES
 *   • rpc search_listings (25 filtres, 7 tris, disponibilité sur les dates)
 *   • rpc suggest_similar_listings
 *
 * SÉCURITÉ
 *   • Les filtres sont dans l'URL (partageables) ; validés par commun/validation avant l'appel
 *
 * À FAIRE
 *   [ ] Pagination par 24, défilement infini sur mobile
 *   [ ] Carte : afficher la commune, jamais l'adresse exacte du loueur
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export default function Page() {
  return null; // À développer
}
