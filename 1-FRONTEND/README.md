# 1-FRONTEND — ce que voient les utilisateurs

Trois applications Next.js séparées + des paquets communs. Hébergement : **Vercel** (un projet par application).

```
1-FRONTEND/
├── client/            Site public + espace client          www.votre-domaine.ci    (indexé par Google)
├── vendeur/           Espace partenaire                    pro.votre-domaine.ci    (non indexé)
├── administrateur/    Back-office de l'équipe              admin.votre-domaine.ci  (non indexé, 2FA obligatoire)
└── commun/
    ├── ui/            Design system : boutons, champs, curseur double, badges… (WCAG 2.2 AA)
    ├── supabase/      Clients Supabase navigateur / serveur / proxy (clé publique uniquement)
    ├── types/         Types générés depuis la base (pnpm db:types)
    ├── validation/    Schémas partagés avec l'API : téléphone +225, montants FCFA, dates, filtres
    ├── i18n/          Textes et traduction des 87 codes d'erreur de la base
    └── config/        TypeScript et ESLint communs
```

## Pourquoi trois applications et pas une seule ?

| Raison | Explication |
|---|---|
| **Vitesse du site client** | Le code du back-office (lourd) n'est jamais téléchargé par les visiteurs sur mobile |
| **Isolation du back-office** | Domaine, cookies et en-têtes séparés ; une faille sur le site public n'ouvre pas l'administration |
| **Déploiements indépendants** | Corriger le back-office ne redéploie pas le site client |
| **Équipes** | Plus tard, une personne peut travailler sur l'espace partenaire sans toucher au reste |

## Les règles communes aux trois applications

1. **Aucun secret** : seules `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL`.
   Un contrôle automatique bloque toute clé secrète dans ce dossier (`.github/workflows/securite.yml`).
2. **La base décide** : prix, disponibilités, droits. L'interface affiche ce que la base renvoie.
3. **Valider deux fois** : `commun/validation` dans le formulaire (confort) — l'API et la base revalident (sécurité).
4. **Erreurs traduites** : la base renvoie un code (`VEHICLE_UNAVAILABLE`), `commun/i18n` le traduit.
5. **Mobile d'abord**, 16 px minimum, zones tactiles de 44 px, images en 3 tailles.
6. **Le proxy (`src/proxy.ts`) n'est pas une protection** : chaque page serveur revérifie l'utilisateur
   avec `getUser()`, et la base applique la RLS.

## Comment une page est construite

```
page.tsx (serveur)                       composant (navigateur, « use client »)
  │ clientServeur() + getUser()            │ clientNavigateur()
  │ lecture des données (RLS)              │ actions : rpc(...) ou appelerApi(...)
  │ rendu HTML rapide, référencé           │ erreur → traduireErreur(code)
  └──────────────► props ─────────────────►┘
```
