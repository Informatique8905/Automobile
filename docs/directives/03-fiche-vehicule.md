# Directive 03 — Fiche véhicule

## Ce que le porteur du projet a demandé
> « Ça, c'était lorsque les véhicules défilent devant le client. Lorsque le client clique sur une voiture
> pour sa description, je veux qu'elle s'affiche comme ce modèle, en prenant en compte toutes les photos
> que le vendeur ou le loueur aura mises, plus la description détaillée. »
> « Il faut miser sur l'expérience utilisateur, que les utilisateurs soient conquis et aient envie de
> toujours revenir. Je ne veux pas voir d'icône. »

Modèle : `docs/references-ui/03-fiche-vehicule/product-rail-gallery.tsx` (pièces qui pivotent face / dos / profil, vue détaillée).

## Adaptation attendue
- Chaque pièce devient une photo du véhicule ; les angles enregistrés par le partenaire (avant, arrière,
  côtés, intérieur, tableau de bord) alimentent face / dos / profil ; « Voir toutes les photos » ouvre la
  galerie complète. **Jamais les illustrations intégrées du modèle.**
- La vue détaillée affiche la description complète et tout le contenu « Fiches véhicules » du cahier des
  charges : en-tête, caractéristiques, bloc de réservation (location) ou d'achat (vente), équipements,
  conditions et documents, profil du partenaire, avis.
