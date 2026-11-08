# Module CLIENT — /client/...

Actions du client qui ont besoin d'un secret ou d'un service externe. Tout le reste (recherche, réservation, messagerie, avis) se fait directement depuis le frontend avec Supabase.

**Accès** : `@Roles('client')` · appels à la base **avec le jeton du client** (la RLS vérifie que c'est SA réservation, SON document)

| Fichier | Rôle | Routes |
|---|---|---|
| `contrats.controller.ts` | Client · Contrat de location | `GET /client/contrats/:reservation` |
| `documents.controller.ts` | Client · Coffre-fort de documents | `POST /client/documents/lien-envoi`<br>`GET /client/documents/:id/lien` |
| `factures.controller.ts` | Client · Factures certifiées | `GET /client/factures/:id` |
| `kyc.controller.ts` | Client · Vérification d'identité | `POST /client/kyc/session`<br>`GET /client/kyc/statut` |
| `mes-donnees.controller.ts` | Client · Mes données (loi 2013-450) | `GET /client/mes-donnees/export/:demande` |
| `paiements.controller.ts` | CLIENT · PAIEMENTS — POST /client/paiements/initier | `POST /client/paiements/initier` |
