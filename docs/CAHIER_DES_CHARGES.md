# Cahier des charges — Projet location et vente de véhicule 2026

*Transcription fidèle des 16 pages de notes manuscrites du porteur du projet. Compléments priorisés : `AJOUTS_CAHIER_DES_CHARGES.md` (racine du dépôt). Directives écran par écran : `docs/directives/`.*

Projet : « Projet location et vente de véhicule 2026 » — plateforme web/mobile (marketplace) de location ET de vente de véhicules.
Contexte : Côte d'Ivoire (Abidjan), Afrique de l'Ouest francophone, zone UEMOA, monnaie FCFA (XOF). Paiement par cartes et Mobile Money via **Jeko** (seul prestataire).

## 1. Page d'inscription
- Nom
- Prénoms
- Email / Mot de passe
- Adresse (habitation)
- Numéro de téléphone
- Système de connexion via Google, iOS (Apple)

## 2. Page de connexion
- Email ou numéro de téléphone
- Mot de passe
- Système de connexion via Google, iOS (Apple)

## 3. Page d'accueil
### 3.1 Structure de la page
- Navigation supérieure : Logo ; Louer / Acheter / Vendre ; Espace utilisateur ; Connexion / Inscription
- Moteur de recherche : Onglet Location ; Onglet Achat
- Catégories visuelles : Types de voitures ; Types de modèle
- Sections dynamiques : Véhicules à la une (Vente) ; Offres du moment (Location)
- Bloc de réassurance (icônes) : Paiement 100 % sécurisé ; Assurance multirisque incluse (pour la location) ; Véhicules inspectés et vérifiés ; Assurance client

### 3.2 Fonctionnalités — Expérience utilisateur (UX) et accessibilité
- Approche Mobile-First
- Normes d'accessibilité
- Performance de chargement (2 secondes) : formats modernes comme WebP ou AVIF et le lazy loading

### 3.3 Conformité légale et sécurité
- Respect de la vie privée (RGPD / CCPA)
- Sécurité des données (HTTPS / SSL)
- Affichage transparent des prix

## 4. Espace utilisateur (locataire / acheteur)
1. Tableau de bord (locataire / acheteur) : Rappels contextuels (smart cards) ; Historique des activités
2. Section « Vérification et Docs » : Statut de validation (En attente / Validé / Refusé) ; Coffre-fort numérique (permis de conduire recto/verso, pièce d'identité) ; Norme UX
3. Messagerie contextuelle : boîte de réception unique mais centrée sur l'objet (chaque conversation rattachée à un véhicule / une réservation)
4. Paiement et facturation : téléchargement des factures

## 5. Espace Partenaire (loueur pro / particulier et vendeur)
1. Tableau de bord business : Indicateurs clés (KPIs) ; To-do list automatisée
2. Gestion de flotte : Statut en temps réel (Disponible, Loué, En maintenance, Hors service) ; Éditeur d'annonce fluide (modifier prix, ajouter photos avec glisser-déposer) ; Ajouter une description
3. Normes internationales et fonctionnalités UX transverses : Double authentification (2FA) ; Bouton « Supprimer mon compte »

## 6. Page Catalogue (résultats de recherche)
1. Barre supérieure et filtres rapides :
   - Rappel du contexte de recherche : affichage clair du lieu et des dates (pour la location) ou du type d'achat choisi
   - Filtres « chips » (boutons pilules rapides) : les filtres les plus demandés sous forme de petits boutons horizontaux cliquables en un tap
   - Commutateur de vue : sur desktop liste à gauche / carte à droite ; sur mobile bouton flottant « Afficher la carte » / « Afficher la liste »
2. Panneau de filtres avancés (sidebar) :
   - Mode d'acquisition : onglet ou filtre prioritaire Location / Vente
   - Budget : slider de prix dynamique, curseur à deux poignées (prix min – max)
   - Localisation et rayon : choix de ville + curseur de distance
   - Caractéristiques techniques : marque / modèle / année / type de carburant / boîte de vitesse / nombre de places
   - Type de vendeur / propriétaire : professionnel / particulier
   - Conditions spécifiques : livraison à domicile / siège bébé / animaux acceptés ; véhicule garanti / certifié
3. Cartes produits : chaque carte doit synthétiser un maximum d'infos clés sans surcharge visuelle.
   - Carrousel d'images au survol : faire défiler 4/5 photos sans ouvrir la fiche
   - Bouton favoris sans quitter le catalogue
   - Système de badges de réassurance : Super hôte / Vendeur vérifié ; Garantie 12 mois (vente) ; Confirmation instantanée (location)
   - Transparence des tarifs : location : total/jour et prix estimé selon la durée choisie
4. Tri, chargement, performance UX :
   - Système de tri : pertinence (par défaut) ; prix haut→bas ; prix bas→haut ; kilométrage croissant ; les plus proches de moi ; note clients
   - Chargement et états particuliers : comparateur de véhicules (choisir 2/3 véhicules et ouvrir un tableau comparatif côte à côte) ; gestion du « zéro résultat » (bouton « Réinitialiser les filtres », suggestion de véhicules similaires disponibles)

## 7. Fiches véhicules
1. Galerie médias : grille de 5 photos (desktop) / carrousel plein écran (mobile) — voir la voiture sous tous les angles ; bouton « Voir toutes les photos »
2. En-tête et infos rapides : titre complet (marque + modèle + année + finition) ; chips d'information : carburant (essence/diesel/électrique), transmission (manuelle/auto), kilométrage, nombre de places ; description ; repère géographique : indication du quartier / de la ville de prise en charge
3. Bloc de conversion :
   - Volet LOCATION : prix par jour bien visible ; sélecteur de dates et lieu de restitution ; transparence totale : calcul automatique « prix des journées + options choisies = total » ; mention des cautions ; HT/TTC ; bouton principal « RÉSERVER MAINTENANT »
   - Volet VENTE : prix total du véhicule ; simulateur d'échéances de crédit ; CTA « RÉSERVER UN ESSAI (test drive) » / « CONTACTER LE VENDEUR »
4. Détails techniques et transparence : grille d'équipements (confort, technologie, sécurité)
5. Conditions et documents téléchargeables :
   - LOCATION : conditions d'annulation ; politique de carburant ; kilométrage inclus
   - VENTE : carnet d'entretien et contrôle technique à jour ; bouton pour télécharger le rapport d'inspection / historique du véhicule
6. Profil du vendeur / hôte : photo de profil / logo d'agence + badge « Vérifié » ; nom du partenaire, date d'inscription et taux de réponse ; avis et notes laissés sur ce propriétaire / cette agence
7. Adaptation mobile

## 8. Tunnel de réservation et de paiement (barre de progression avec étapes a → d)
a) Options et assurances
   - Récapitulatif express : rappel des dates, lieux de départ/retour et visuel du véhicule en haut de page
   - Choix de la formule d'assurance : Responsabilité civile (RC) ; formule intermédiaire ; tous risques
   - Équipements et services additionnels : sièges enfant / rehausseur ; boîtier GPS ; conducteur supplémentaire ; kilométrage supplémentaire ; option livraison / restitution à domicile / à l'hôtel
b) Conducteur et vérification d'identité (KYC)
   - Technologie recommandée : module de vérification instantanée par IA — l'utilisateur photographie son permis, l'IA valide la pièce et l'âge légal
c) Récapitulatif détaillé et paiement sécurisé
   - Récapitulatif détaillé des coûts : location véhicule ; option assurance ; taxes / frais de service ; total à payer ; garantie / caution (non débitée)
   - Gestion de la caution : « norme internationale » — la caution ne doit pas être prélevée mais faire l'objet d'une empreinte bancaire (pré-autorisation)
   - Modes de paiement : cartes ; Mobile Money (solution de paiement : Jeko)
d) Confirmation et post-achat immédiat
   - Écran de confirmation (numéro de réservation + QR code de prise en charge)
   - Génération automatique du contrat (PDF) : téléchargeable et envoyé par e-mail
   - Boutons d'action immédiats : voir l'itinéraire vers le point de retrait ; contacter l'hôte / l'agence
CAS VENTE :
   - Réservation d'un essai : choix date/heure ; saisie du permis ; confirmation
   - Acompte de réservation (achat)

## 9. Pages institutionnelles (FAQ, Contact, À propos)
1. À propos : expliquer pourquoi la plateforme est sûre, simple et fiable ; chiffres chocs ; présentation de l'équipe / du fondateur (incertain) ; logos de partenaires (incertain)
2. FAQ : moteur de recherche prédictif ; séparation par onglets (Location ; Vente/Achats ; Paiement et sécurité ; Espace partenaire/vendeur) ; interface en accordéon
3. Contact / Support : distinction urgent / standard (numéro vert ; formulaire de contact / chatbot) ; formulaire de contact dynamique (n° de réservation, permis / email) ; intégration WhatsApp Business ; localisation des agences physiques

## Éléments absents des notes, traités dans AJOUTS_CAHIER_DES_CHARGES.md
- Modèle économique (commissions, abonnements, mise en avant payante), tarification
- Back-office / administration de la plateforme (modération, validation KYC, litiges, remboursements)
- Gestion des litiges, dommages, état des lieux départ/retour (photos), franchise d'assurance
- Location avec chauffeur (très répandue localement), durée minimale, livraison
- Publication d'annonces de vente par des particuliers (parcours « Vendre »)
- Notifications (SMS, push, WhatsApp, email), multilingue
- Stack technique, hébergement, application native vs PWA
- Cadre légal local (la note cite RGPD/CCPA mais pas la loi ivoirienne)
