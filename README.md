# Plateforme de location et de vente de véhicules — Côte d'Ivoire

Structure complète du projet, conçue **avant** la phase de développement.
Chaque dossier contient un `README.md` qui explique ce qu'il contient et pourquoi.
Chaque fichier de code commence par un en-tête : **rôle, contenu, données utilisées, règles de sécurité, tâches à faire**.

```
plateforme-vehicules/
│
├── README.md                      ← vous êtes ici : comment lire la structure
├── STRUCTURE.md                   ← l'arborescence complète, fichier par fichier, avec le rôle de chacun
├── ARCHITECTURE.md                ← la vue d'ensemble : schémas, choix techniques, flux
├── AJOUTS_CAHIER_DES_CHARGES.md   ← ce qu'il faut ajouter au cahier des charges (priorisé)
├── DEPLOIEMENT.md                 ← Vercel + Render + Supabase gratuits : limites, pièges, passage au payant
├── docs/                          ← cahier des charges, directives (docs/directives) et modèles visuels (docs/references-ui)
│   └── PROMPT_DEVELOPPEMENT.md    ← le prompt à donner à l'agent de développement
│
├── 1-FRONTEND/                    ← ce que voient les utilisateurs (Vercel)
│   ├── client/                    ← site public + espace client       → www.votre-domaine.ci
│   ├── vendeur/                   ← espace partenaire (loueur, vendeur) → pro.votre-domaine.ci
│   ├── administrateur/            ← back-office de l'équipe           → admin.votre-domaine.ci
│   └── commun/                    ← composants, types, validation, textes partagés
│
├── 2-BACKEND/                     ← ce qui tourne sur les serveurs
│   ├── api/                       ← API NestJS (Render) : paiement Jeko, factures FNE, KYC, IA, notifications
│   │   └── src/modules/
│   │       ├── client/            ← actions du client (payer, vérifier son identité, factures, export de données)
│   │       ├── vendeur/           ← actions du partenaire (photos, états des lieux, versements, équipe)
│   │       ├── administrateur/    ← actions de l'équipe (remboursements, versements, KYC, agents IA, incidents)
│   │       └── commun/            ← intégrations partagées (Jeko, FNE, notifications, PDF, images)
│   └── base-de-donnees/           ← votre base Supabase (22 migrations testées, 34 scénarios)
│
├── 3-SECURITE/                    ← la sécurité, rangée à part pour être visible et vérifiable
│   ├── 01-modele-de-menaces/      ← qui peut attaquer, comment, et ce qui l'en empêche
│   ├── 02-authentification-et-acces/
│   ├── 03-protection-des-donnees/ ← loi ivoirienne 2013-450, ARTCI, chiffrement, conservation
│   ├── 04-securite-applicative/   ← en-têtes HTTP, limites de requêtes, webhooks, fichiers (code partagé)
│   ├── 05-agents-ia/              ← les agents IA de sécurité (code)
│   ├── 06-surveillance-et-alertes/
│   ├── 07-reponse-aux-incidents/
│   ├── 08-tests-de-securite/
│   └── 09-checklists/             ← avant le lancement, chaque mois, chaque nouvelle fonctionnalité
│
├── .github/workflows/             ← intégration continue, scans de sécurité, sauvegarde nocturne de la base
├── render.yaml                    ← déploiement du backend sur Render (Blueprint)
├── package.json, pnpm-workspace.yaml, turbo.json  ← monorepo (un seul dépôt, plusieurs applications)
└── .env.example                   ← toutes les variables d'environnement, service par service
```

## Ordre de lecture conseillé

1. `ARCHITECTURE.md` — comprendre comment les pièces s'assemblent (15 min)
2. `STRUCTURE.md` — l'arborescence complète, chaque fichier avec son rôle
3. `AJOUTS_CAHIER_DES_CHARGES.md` — ce qui manque et dans quel ordre le construire
4. `DEPLOIEMENT.md` — avant de créer les comptes Vercel / Render / Supabase
5. `3-SECURITE/README.md` — les règles à respecter dès la première ligne de code
6. Puis le `README.md` du dossier sur lequel vous travaillez

## Les 5 règles d'or du projet

1. **La base de données décide.** Prix, disponibilités, droits : tout est calculé et vérifié dans Supabase
   (règles RLS + fonctions). Le navigateur n'est jamais cru sur parole.
2. **Aucun secret dans le frontend.** Le frontend n'a que la clé *publique* Supabase. La clé secrète,
   la clé Jeko, la clé IA vivent uniquement sur Render.
3. **Tout argent passe par une signature vérifiée.** Un paiement n'est validé que par un webhook Jeko
   signé, au bon montant — jamais par la page de retour du navigateur, jamais par un SMS.
4. **L'IA propose, l'humain dispose.** Les agents IA signalent et peuvent masquer ; ils ne suppriment rien,
   ne valident aucun KYC et ne sanctionnent personne.
5. **Chaque action sensible laisse une trace** dans un journal d'audit que personne ne peut modifier.

## Démarrer

```bash
# Prérequis : Node.js 22, pnpm 10, Docker (pour Supabase en local)
pnpm install
pnpm --filter base-de-donnees db:start      # Supabase local + 22 migrations + données de départ
pnpm dev                                    # lance client, vendeur, administrateur et api
```

| Application | Adresse locale |
|---|---|
| Client | http://localhost:3000 |
| Vendeur | http://localhost:3001 |
| Administrateur | http://localhost:3002 |
| API | http://localhost:4000 |
| Supabase Studio | http://localhost:54323 |

> Les versions des dépendances dans les `package.json` sont indicatives : lancer `pnpm up --latest`
> au tout début du développement, puis figer les versions.
