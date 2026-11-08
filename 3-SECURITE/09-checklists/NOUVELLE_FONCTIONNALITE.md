# Checklist — chaque nouvelle fonctionnalité

À coller dans la description de la demande de fusion (pull request).

- [ ] **Données** : quelle nouvelle donnée personnelle ? Niveau (public / interne / confidentiel / très sensible) ?
      Faut-il mettre à jour le registre des traitements ?
- [ ] **Base** : RLS activée sur les nouvelles tables ; droits retirés puis rendus colonne par colonne ;
      fonctions `security definer` avec `search_path` vide ; test SQL ajouté dans `tests/`
- [ ] **Argent** : un montant vient-il du navigateur ? (interdit : il doit être calculé en base)
- [ ] **Secrets** : aucun secret dans `1-FRONTEND` ; nouvelles variables ajoutées à `.env.example`
- [ ] **Entrées** : validées par un schéma (`commun/validation`) côté frontend ET côté API
- [ ] **Fichiers** : contrôlés par `controlerFichier` ; bucket privé si sensible
- [ ] **Journal** : action sensible tracée dans `audit_logs`
- [ ] **IA** : nouveau type de contenu à modérer ? → nouvel agent en `shadow`
- [ ] **Modèle de menaces** relu : nouvelle menace ?
