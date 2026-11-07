# Module VENDEUR — /vendeur/...

Actions du partenaire qui demandent un traitement serveur : photos (conversion, empreinte anti-copie), photos d'état des lieux, comptes de versement (chiffrement), e-mails d'invitation, exports.

**Accès** : `@Roles('partner')` · la base revérifie l'appartenance à l'agence et le rôle owner / manager / agent

| Fichier | Rôle | Routes |
|---|---|---|
| `equipe.controller.ts` | Vendeur · Invitations d'équipe | `POST /vendeur/equipe/invitations/:id/envoyer` |
| `etats-des-lieux.controller.ts` | Vendeur · Photos d'état des lieux | `POST /vendeur/etats-des-lieux/:reservation/photos` |
| `exports.controller.ts` | Vendeur · Exports comptables | `GET /vendeur/exports/releve` |
| `photos.controller.ts` | Vendeur · Photos d'annonce | `POST /vendeur/photos`<br>`DELETE /vendeur/photos/:id` |
| `versements.controller.ts` | Vendeur · Comptes de versement | `POST /vendeur/versements/comptes` |
