# Directive 02 — Page d'accueil

## Ce que le porteur du projet a demandé
> « Pour la page d'accueil, je veux que tu utilises ce modèle » (+ règles communes 00) — « je veux de vraies
> données, pas de données fictives ». Les véhicules doivent « défiler devant le client ».

Modèle : `docs/references-ui/02-page-accueil/dish-orbit-carousel.tsx` (carrousel en orbite piloté par le défilement, GSAP).

## Adaptation attendue
- Chaque « plat » devient un **véhicule à la une** : vraie photo de couverture, marque (ligne fine) +
  modèle (ligne forte), prix (par jour ou total), note et nom du partenaire (badge Vérifié), description
  courte, équipements en puces, couleur d'accent par véhicule ; clic → fiche véhicule.
- Le reste de l'accueil suit le cahier des charges : navigation (Louer / Acheter / Vendre), moteur de
  recherche à onglets Location / Achat, catégories visuelles (en photos réelles), offres du moment,
  bloc de réassurance (en texte, sans pictogrammes).
- Données : `search_listings` (annonces à la une, offres), aucune image Unsplash, aucun tableau en dur.
