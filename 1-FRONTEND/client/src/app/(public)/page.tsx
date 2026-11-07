/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Accueil
 * Route : /    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CAHIER DES CHARGES
 *   Page d'accueil — 1.1 Structure de la page
 *
 * CONTENU
 *   • Navigation : logo, Louer / Acheter / Vendre, espace utilisateur, connexion / inscription
 *   • Moteur de recherche à onglets : Location (lieu + dates) / Achat (budget, marque)
 *   • Catégories visuelles : types de voitures, types de modèles
 *   • Sections dynamiques : Véhicules à la une (vente), Offres du moment (location)
 *   • Bloc de réassurance : paiement sécurisé Jeko, assurance (si contrat signé), véhicules vérifiés
 *
 * DONNÉES
 *   • rpc search_listings (à la une : is_featured ; offres : offer_discount_pct)
 *   • table vehicle_categories
 *   • rpc get_platform_stats
 *
 * SÉCURITÉ
 *   • Lecture publique (rôle anon) : la RLS ne renvoie que les annonces publiées
 *
 * À FAIRE
 *   [ ] Rendu serveur + cache de 5 min (revalidate)
 *   [ ] Images en 3 tailles (srcset), chargement différé sous la ligne de flottaison
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export default function Page() {
  return null; // À développer
}
