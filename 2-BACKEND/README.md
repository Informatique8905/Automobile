# 2-BACKEND — ce qui tourne sur les serveurs

```
2-BACKEND/
├── api/                    API NestJS — hébergée sur Render
│   └── src/
│       ├── main.ts         démarrage : en-têtes, CORS limité, corps brut pour les webhooks
│       ├── app.module.ts   gardes globales : limites → jeton vérifié → rôles (+ 2FA équipe)
│       ├── noyau/          configuration vérifiée, accès base, authentification, erreurs, santé
│       ├── modules/
│       │   ├── client/         /client/...          payer, vérifier son identité, contrat, factures, mes données
│       │   ├── vendeur/        /vendeur/...         photos, états des lieux, comptes de versement, équipe, exports
│       │   ├── administrateur/ /administrateur/...  remboursements, versements, documents, agents IA, incidents
│       │   └── commun/         Jeko, FNE, KYC, notifications, PDF, images, chiffrement, pont IA
│       └── taches/         /interne/taches/executer : réconciliation, notifications, IA, FNE, synthèse
│
└── base-de-donnees/        Supabase : 22 migrations, seed, 34 scénarios de test
```

## La règle d'or : qui fait quoi

| Si l'action… | …elle se fait | Exemple |
|---|---|---|
| est protégée par la RLS et n'a besoin d'aucun secret | **dans le frontend, directement avec Supabase** | Rechercher, réserver, écrire un message, noter |
| a besoin d'un secret ou d'un service externe | **dans l'API Render** | Payer (Jeko), KYC, facture FNE, PDF, photo, e-mail |
| est une règle métier ou de sécurité | **dans la base** (fonction + RLS) | Prix, disponibilité, annulation, droits, plafond, 2FA équipe |

Conséquence : l'API est **petite**. La plupart des pages fonctionnent même si Render dort.

## Client / vendeur / administrateur côté backend

| Côté | Préfixe | Qui | Garde |
|---|---|---|---|
| Client | `/client/...` | Toute personne connectée | `@Roles('client')` |
| Vendeur | `/vendeur/...` | Membres d'un partenaire | `@Roles('partner')` + la base vérifie l'agence et le rôle |
| Administrateur | `/administrateur/...` | Équipe interne | `@Roles('admin' / 'moderator' / 'support')` **+ session aal2** |
| Webhooks | `/webhooks/jeko`, `/webhooks/kyc` | Prestataires | `@Public()` + **signature HMAC obligatoire** |
| Tâches | `/interne/taches/executer` | La base (pg_cron) | `@Public()` + **secret partagé** |
| Santé | `/sante` | Render, surveillance | `@Public()` |

## Les deux clients Supabase de l'API

- `base.pourUtilisateur(jeton)` : **par défaut**. Agit au nom de l'utilisateur, la RLS s'applique.
- `base.admin` : clé secrète. Uniquement webhooks, tâches, agents IA — **chaque usage porte un commentaire « Clé secrète justifiée »**.

Voir `api/README.md` pour démarrer, et `base-de-donnees/docs/BASE_DE_DONNEES.md` pour la carte des tables.
