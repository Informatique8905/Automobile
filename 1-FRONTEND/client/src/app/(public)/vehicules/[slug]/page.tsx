/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Fiche véhicule
 * Route : /vehicules/[slug]    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CAHIER DES CHARGES
 *   Fiches véhicules — galerie, en-tête, bloc de conversion, détails, conditions, profil vendeur
 *
 * CONTENU
 *   • Galerie : grille de 5 photos (desktop) / carrousel plein écran (mobile), « Voir toutes les photos »
 *   • Titre complet : marque + modèle + année + finition ; puces : carburant, boîte, kilométrage, places
 *   • Repère géographique : commune / quartier de prise en charge (pas l'adresse exacte)
 *   • Location : prix/jour, sélecteur de dates et lieu de restitution, calcul automatique du total, caution, RÉSERVER
 *   • Vente : prix total, simulateur d'échéances (partenaire bancaire), RÉSERVER UN ESSAI / CONTACTER
 *   • Grille d'équipements (confort, technologie, sécurité)
 *   • Conditions : annulation, carburant, kilométrage inclus / carnet d'entretien, rapport d'inspection
 *   • Profil du partenaire : logo, badge Vérifié, date d'inscription, taux de réponse, avis
 *
 * DONNÉES
 *   • table listings (+ rental_terms / sale_terms, vehicle_photos, vehicle_equipment)
 *   • rpc quote_rental (devis, jamais calculé dans le navigateur)
 *   • rpc get_listing_busy_periods
 *   • rpc track_listing_event (vue)
 *
 * SÉCURITÉ
 *   • Coordonnées du partenaire JAMAIS affichées avant confirmation (rpc get_booking_contacts)
 *   • Badge « Garantie » affiché seulement si sale_terms.warranty_months > 0 ET contrat de garantie
 *
 * À FAIRE
 *   [ ] Données structurées schema.org (Car, Offer) pour Google
 *   [ ] Partage WhatsApp avec aperçu (Open Graph)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return null; // À développer
}
