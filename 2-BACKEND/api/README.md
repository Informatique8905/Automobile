# API — NestJS sur Render

## Démarrer en local

```bash
cp ../../.env.example .env      # garder la section « 2-BACKEND/api » et remplir avec `npx supabase status`
pnpm --filter api dev           # http://localhost:4000/sante
```
Au démarrage, `src/noyau/config/env.ts` vérifie chaque variable : une variable manquante = l'API refuse de démarrer.

## Ce qui est déjà écrit (code réel) et ce qui reste à développer

| Fichier | État |
|---|---|
| `main.ts`, `app.module.ts`, `noyau/**` | ✅ écrit : configuration, jeton JWKS, rôles + 2FA équipe, filtre d'erreurs, santé |
| `modules/commun/paiements-jeko/**` | ✅ écrit : session de paiement, webhook signé et idempotent, réconciliation — **chemins Jeko à adapter à leur documentation** |
| `modules/client/paiements.controller.ts` | ✅ écrit : initier un paiement (montant fixé par la base) |
| `modules/commun/chiffrement/**` | ✅ écrit : AES-256-GCM des comptes de versement |
| `modules/commun/ia/**`, `taches/**` | ✅ écrit : pont vers les agents IA, orchestrateur des tâches |
| `modules/commun/factures-fne/certification-fne.service.ts` | ✅ écrit (file d'attente) — client FNE à développer avec la DGI |
| Autres contrôleurs et services | 🔨 squelette : routes déclarées, en-tête détaillé, `NotImplementedException` |

## Les routes

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/sante` | Public |
| POST | `/webhooks/jeko` | Public + signature |
| POST | `/webhooks/kyc` | Public + signature |
| POST | `/interne/taches/executer` | Public + secret partagé |
| POST | `/client/paiements/initier` | client |
| POST / GET | `/client/kyc/session` · `/client/kyc/statut` | client |
| POST / GET | `/client/documents/lien-envoi` · `/client/documents/:id/lien` | client |
| GET | `/client/contrats/:reservation` · `/client/factures/:id` · `/client/mes-donnees/export/:demande` | client |
| POST / DELETE | `/vendeur/photos` · `/vendeur/photos/:id` | partner |
| POST | `/vendeur/etats-des-lieux/:reservation/photos` · `/vendeur/versements/comptes` · `/vendeur/equipe/invitations/:id/envoyer` | partner |
| GET | `/vendeur/exports/releve` | partner |
| POST | `/administrateur/remboursements` · `/administrateur/remboursements/:id/valider` | admin (aal2) |
| POST | `/administrateur/versements/lot` | admin (aal2) |
| GET | `/administrateur/documents/:id/lien` | moderator, admin (aal2) |
| POST | `/administrateur/agents-ia/:type/tester` · `/administrateur/agents-ia/taches/:id/rejouer` | admin (aal2) |
| POST | `/administrateur/mes-donnees/:id/export` · `/administrateur/incidents/:id/notifier-personnes` | admin (aal2) |

## Paquets internes
- `@plateforme/securite-applicative` (3-SECURITE/04) : signatures, limites, fichiers
- `@plateforme/agents-ia` (3-SECURITE/05) : agents IA
- `@plateforme/validation` (1-FRONTEND/commun) : mêmes schémas que le frontend
