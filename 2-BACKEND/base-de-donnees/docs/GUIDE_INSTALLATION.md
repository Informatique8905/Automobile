# Guide d'installation — aide-mémoire

Guide complet et illustré (à lire en premier) :
https://claude.ai/artifact/CtFUSoCoB5FHF4AQgmA73a

Ce fichier résume les commandes, pour les avoir sous la main hors connexion.

## Prérequis

Node.js 20+, Docker Desktop démarré, Git, un compte supabase.com.

## En local (première fois)

```bash
# depuis le dossier 2-BACKEND/base-de-donnees/
npm install --save-dev supabase
cp supabase/.env.example supabase/.env
npx supabase start          # applique les 22 migrations + seed.sql
```

| Service | Adresse |
| --- | --- |
| API | http://127.0.0.1:54321 |
| Studio | http://127.0.0.1:54323 |
| Boîte mail de test | http://127.0.0.1:54324 |
| Postgres | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

Valeurs données par `npx supabase status` :

```bash
# 1-FRONTEND/<app>/.env.local  (client, vendeur, administrateur) — clé publique seulement
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# 2-BACKEND/api/.env  — seul endroit où vit la clé secrète
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SECRET_KEY=sb_secret_...      # jamais dans le frontend, jamais NEXT_PUBLIC_
```

## Au quotidien

```bash
npx supabase status                     # adresses et clés
npx supabase db reset                   # rejoue migrations + seed
npx supabase migration new nom_change   # nouvelle migration (ne jamais modifier une ancienne)
npx supabase gen types typescript --local > ../../1-FRONTEND/commun/types/src/database.types.ts
npx supabase stop
```

## Mise en ligne

```bash
npx supabase login
npx supabase link --project-ref <identifiant>
npx supabase db push --dry-run          # aperçu
npx supabase db push --include-seed     # 1re fois ; ensuite : npx supabase db push
```

Puis dans le tableau de bord : Site URL et Redirect URLs, fournisseurs Google / Apple
(callback `https://<identifiant>.supabase.co/auth/v1/callback`), modèles d'email
(`supabase/templates/`), SMTP réel, `pg_cron` + `supabase/optional/cron.sql`, `pg_net` +
`supabase/optional/cron_render.sql` (réveil du backend), premier admin **avec double authentification activée**
(sans code TOTP validé, un admin n'a aucun droit d'admin).

Ne pas lancer `supabase config push` sans bloc `[remotes.production]` : il enverrait les
adresses `localhost` en production.

## Tests hors Supabase

```bash
PGHOST=/tmp PGPORT=5433 PGUSER=postgres ./scripts/test-db.sh            # anciens projets (34 scénarios)
STRICT=1 PGHOST=/tmp PGPORT=5433 PGUSER=postgres ./scripts/test-db.sh   # projets créés après mai 2026
```
