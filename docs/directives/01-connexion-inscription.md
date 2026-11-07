# Directive 01 — Page de connexion et d'inscription

## Ce que le porteur du projet a demandé
> « Pour la page de connexion / d'inscription, je veux que tu t'inspires de ce modèle » (+ règles communes 00).

Modèle : `docs/references-ui/01-connexion-inscription/` (`app-sign-in.tsx`, `demo.tsx`, `theme-reference.css`).

## Ce qu'il faut garder du modèle
Écran partagé (formulaire + panneau de marque sur grand écran, une colonne sur mobile), onglets
Connexion / Créer un compte avec indicateur glissant, validation en direct, jauge de force du mot de passe,
alerte « Verr. Maj. », lien de connexion par e-mail avec code à 6 chiffres, états chargement / erreur /
succès, annonces pour lecteurs d'écran, focus géré, animations courtes et désactivables.

## Ce qu'il faut changer
- Tout en français ; marque et logo du projet ; charte 65 % blanc / 35 % orange vif.
- Fournisseurs : **Google et Apple** (pas GitHub) + **numéro de téléphone ivoirien (+225) avec code SMS**.
- Champs d'inscription du cahier des charges : nom, prénoms, e-mail, mot de passe, adresse (commune /
  quartier), téléphone ; cases CGU + confidentialité obligatoires, marketing facultatif.
- Connexion par e-mail OU numéro de téléphone + mot de passe, ou par code.
- Supprimer : témoignage inventé, « SOC 2 », « Work email », « Free for up to 5 responders », la marque Kestrel,
  le faux serveur de démonstration (`demoSubmit`).
- Le fichier `app-block-kit` importé par le modèle n'est pas fourni : le recréer dans le design system.
