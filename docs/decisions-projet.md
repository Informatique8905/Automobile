# Décisions du projet

*Mises à jour au fil des échanges. Dernière mise à jour : 8 novembre 2026.*

| Date | Décision |
|---|---|
| 06/11/2026 | Paiement : **Jeko** uniquement (aucun autre prestataire mentionné). |
| 06/11/2026 | Hébergement : frontend sur Vercel (3 apps : client, vendeur, administrateur), API sur Render, base sur Supabase. |
| 07/11/2026 | **Pas de MVP réduit** : on construit l'application complète du cahier des charges + les ajouts. L'ordre MVP ne sert qu'à séquencer les parties. |
| 07/11/2026 | Démarches administratives (Jeko, ARTCI, FNE DGI, assureur) : **gérées par le porteur du projet**, hors périmètre du développement. |
| 07/11/2026 | Jeko sera branché **plus tard**. En attendant, le paiement passe par un **mode simulation** : seul `2-BACKEND/api/src/modules/commun/paiements-jeko/jeko.client.ts` changera au branchement. |
| 07/11/2026 | Méthode : le porteur du projet donne des **directives partie par partie** ; chaque partie est livrée complète. Première étape technique : connecter la base Supabase au dépôt et aux applications. |
| 07/11/2026 | Développement confié à un agent de code (extension Claude dans l'éditeur) avec `docs/PROMPT_DEVELOPPEMENT.md`. Les directives vivent dans `docs/directives/`, les modèles visuels dans `docs/references-ui/`. |
| 07/11/2026 | Charte : **65 % blanc, 35 % orange vif** (`#FF6B00` avec texte `#111827` ; `#C2410C` pour texte blanc sur orange ou texte orange sur blanc). Logo : `Logo auto.png` du porteur du projet. |
| 07/11/2026 | **Aucune icône ni illustration créée par IA**, pas de pictogrammes décoratifs ; vraies photos des annonces ; logos officiels Google / Apple. |
| 07/11/2026 | **Vraies données uniquement** (Supabase) : aucune donnée de démonstration, aucune image de banque d'images, aucun faux avis ; états vides soignés. |
| 07/11/2026 | Modèles retenus : connexion / inscription ← `app-sign-in` ; accueil ← `dish-orbit-carousel` (véhicules à la une qui défilent) ; fiche véhicule ← `product-rail-gallery` (toutes les photos + description) ; tableaux de bord ← `dashboard-with-collapsible-sidebar`. |
| 08/11/2026 | Authentification simplifiée : e-mail + code à 6 chiffres ; téléphone enregistré sans vérification SMS ; Google / Apple masqués (`NEXT_PUBLIC_SSO_ACTIVE`). Partie 1 (socle + authentification) terminée. |
| 08/11/2026 | Suite du développement pilotée par `docs/PROMPT_SUITE_DEVELOPPEMENT.md` (parties 1-bis à 12, animations détaillées). **L'agent met chaque partie terminée sur le dépôt** : branche `partie-N-nom` → vérifications → demande de fusion → CI verte → fusion dans `main` → déploiement automatique. Jamais de fusion avec CI rouge ni de push forcé. |
| 08/11/2026 | Premier déploiement (partie 1-ter) juste après la partie 1-bis, avant l'espace vendeur. |
