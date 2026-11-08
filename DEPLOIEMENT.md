# Déploiement — Vercel + Render + Supabase

*Vérifié en novembre 2026. Les offres gratuites changent : revérifier les liens en bas de page avant de lancer.*

---

## 1. Qui héberge quoi

| Service | Héberge | Pourquoi lui |
|---|---|---|
| **Vercel** | Les 3 applications frontend (client, vendeur, administrateur) | Fait pour Next.js, CDN mondial, déploiement à chaque `git push` |
| **Render** | L'API NestJS (`2-BACKEND/api`) | Serveur Node.js toujours prêt à recevoir les webhooks Jeko et à faire tourner les agents IA |
| **Supabase** | La base PostgreSQL, l'authentification, le stockage des fichiers | Votre base est déjà construite pour Supabase (RLS, Auth, Storage) |

> ⚠ **Ne mettez pas la base de données sur Render.** La base PostgreSQL gratuite de Render expire
> **30 jours** après sa création ; après 14 jours de grâce, elle est **supprimée avec ses données**.
> Elle n'a ni sauvegarde ni pool de connexions. La base reste sur Supabase.

---

## 2. Les offres gratuites : ce qu'elles permettent, ce qui coince

### Vercel — offre Hobby

| Point | Réalité | Conséquence pour vous |
|---|---|---|
| **Usage** | **Réservé à un usage personnel et non commercial** | ✅ Bêta privée sans transaction réelle · ❌ Dès que la plateforme encaisse ou prend une commission → **passer en Pro** |
| Tâches planifiées (cron) | Une fois par jour maximum, à l'heure près | Les tâches fréquentes passent par la base (`pg_cron`) |
| Pare-feu, DDoS, HTTPS, domaines | Inclus | ✅ |

### Render — service web gratuit

| Point | Réalité | Conséquence |
|---|---|---|
| Mise en veille | Après **15 min** sans requête ; réveil en **~1 min** | La base réveille l'API toutes les 5 min en journée (`optional/cron_render.sql`) ; le client voit « Connexion au service de paiement… » |
| Heures gratuites | **750 h / mois** pour tout le compte | **Un seul** service gratuit allumé en continu |
| Disque | Effacé à chaque redémarrage | Aucun fichier stocké sur Render : tout va dans Supabase Storage |
| Ports e-mail 25, 465, 587 | **Bloqués** | Envoyer les e-mails par une **API HTTP** (Resend, Brevo…), pas en SMTP |
| Redémarrage | Possible à tout moment | Toutes les tâches sont idempotentes et reprennent seules |

### Supabase — offre Free

| Point | Réalité | Conséquence |
|---|---|---|
| Base | 500 Mo | Suffisant pour démarrer (pas de photos dans la base) |
| Fichiers | 1 Go | Photos compressées en WebP (≈ 150–300 Ko), 12 photos max par véhicule |
| Mise en pause | Après **7 jours sans activité** | Le réveil de l'API toutes les 5 min maintient l'activité ; le projet de recette, lui, se mettra en pause |
| **Sauvegardes** | **Aucune** | Sauvegarde nocturne chiffrée par GitHub Actions (`.github/workflows/sauvegarde-base.yml`) |
| Projets gratuits | 2 | 1 production + 1 recette |
| Régions | Amériques, Europe, Asie-Pacifique (pas d'Afrique) | Choisir **Europe (Francfort ou Paris)** : la plus proche d'Abidjan · déclarer le transfert à l'ARTCI |

---

## 3. Le plan en trois temps

| Phase | Durée | Vercel | Render | Supabase | Coût mensuel |
|---|---|---|---|---|---|
| **A. Construction + bêta privée** (pas de vrai paiement, testeurs invités) | 2–4 mois | Hobby | Free | Free | **0** |
| **B. Lancement public** (dès le 1ᵉʳ paiement réel) | — | **Pro** (20 $/membre) | **Starter** (7 $, plus de mise en veille) | **Pro** (25 $ : pas de pause, sauvegardes quotidiennes 7 j, 8 Go) | **≈ 52 $** (≈ 30 000 FCFA selon le dollar) |
| **C. Croissance** | — | Pro | 2 instances | Instance plus grosse | selon trafic |

Pourquoi ne pas lancer en gratuit : usage commercial interdit sur Vercel Hobby, aucune sauvegarde sur
Supabase Free, et un client qui attend 1 minute devant la page de paiement à 3 h du matin abandonne.

---

## 4. Mise en place pas à pas

### 4.1 Supabase
1. Créer le projet de **production** (région Europe) et le projet de **recette**.
2. `cd 2-BACKEND/base-de-donnees && npx supabase link --project-ref <id> && npx supabase db push --include-seed`
3. Authentification : activer e-mail, téléphone (fournisseur SMS), Google, Apple, **TOTP** ; protection CAPTCHA.
4. URL du site et URL de redirection : les trois domaines Vercel.
5. Extensions : `pg_cron`, `pg_net` ; exécuter `supabase/optional/cron.sql` puis `cron_render.sql`.
6. Créer le premier administrateur, **activer sa double authentification**, puis lui donner le rôle `admin`.

### 4.2 Render
1. « New → Blueprint » et sélectionner le dépôt : `render.yaml` crée le service `api`.
2. Renseigner les secrets (voir `.env.example`, section API) dans le tableau de bord Render — jamais dans le dépôt.
3. Domaine personnalisé : `api.votre-domaine.ci`.
4. Dans Jeko : URL du webhook = `https://api.votre-domaine.ci/webhooks/jeko`.

### 4.3 Vercel
1. Importer le dépôt **trois fois** (un projet par application) avec comme dossier racine :
   `1-FRONTEND/client`, `1-FRONTEND/vendeur`, `1-FRONTEND/administrateur`.
2. Variables : uniquement `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL`.
3. Projet `administrateur` : activer la **protection des déploiements** de prévisualisation.
4. Domaines : `www.`, `pro.`, `admin.`.

### 4.4 GitHub
1. Protéger la branche `main` (revue obligatoire, CI verte).
2. Secrets du dépôt pour la sauvegarde : `SUPABASE_DB_URL`, `BACKUP_PASSPHRASE`.
3. Activer Dependabot et l'analyse des secrets.

---

## 5. Avant d'encaisser le premier franc

- [ ] Passage en Vercel Pro, Render Starter, Supabase Pro
- [ ] Jeko : contrat signé, réponses écrites sur la pré-autorisation, les remboursements, les versements fractionnés et le plafond
- [ ] ARTCI : déclaration et autorisations (KYC biométrique, transfert vers l'Europe)
- [ ] FNE : accès à l'API de la DGI et numéro de contribuable
- [ ] Assureur : contrat-cadre signé pour la formule « incluse »
- [ ] Liste `3-SECURITE/09-checklists/AVANT_LANCEMENT.md` entièrement cochée

---

Sources vérifiées : [Vercel — Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines) ·
[Vercel — Cron Jobs, usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) ·
[Render — Deploy for Free](https://render.com/docs/free) · [Supabase — Regions](https://supabase.com/docs/guides/platform/regions) ·
[Supabase — MFA](https://supabase.com/docs/guides/auth/auth-mfa)
