# Directive 04 — Tableaux de bord

## Ce que le porteur du projet a demandé
> « Pour le tableau de bord, je veux que tu t'inspires de ce modèle pour avancer, tout en respectant tous les
> critères de mon cahier des charges. »

Modèle : `docs/references-ui/04-tableaux-de-bord/dashboard-with-collapsible-sidebar.tsx` (barre latérale repliable, cartes d'indicateurs, mode sombre).

## Adaptation attendue
- Mise en page commune des espaces **vendeur** (pro.) et **administrateur** (admin.), et du tableau de
  bord **client** dans sa version allégée.
- Menus = ceux du cahier des charges et des ajouts (voir les README de chaque application).
- Indicateurs réels (`get_partner_kpis`, `get_partner_revenue_series`, `get_partner_todos`, files d'attente
  du back-office) ; aucun chiffre ni graphique inventé.
- Navigation lisible par le texte ; pictogrammes seulement fonctionnels, discrets et cohérents.
