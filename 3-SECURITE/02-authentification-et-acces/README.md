# 02 — Authentification et contrôle d'accès

## 1. Les moyens de connexion

| Moyen | Client | Vendeur | Équipe |
|---|---|---|---|
| E-mail + mot de passe | ✅ | ✅ | ✅ |
| **Téléphone + code SMS** (ou WhatsApp) | ✅ recommandé | ✅ | ❌ |
| Google, Apple | ✅ | ✅ | ❌ (comptes nominatifs uniquement) |
| Double authentification TOTP (application) | proposée | **fortement recommandée** au propriétaire | **obligatoire** |

> Apple exige qu'une application iOS qui propose Google propose aussi « Se connecter avec Apple » :
> c'est déjà prévu dans `supabase/config.toml`.

## 2. Mots de passe et sessions

- 10 caractères minimum, refus des mots de passe trop courants (réglage Supabase Auth).
- CAPTCHA à l'inscription et après plusieurs échecs (protection Supabase Auth).
- Session client / vendeur : jeton d'accès court renouvelé automatiquement ; déconnexion de tous les appareils
  possible depuis « Sécurité du compte ».
- Session équipe : **8 heures maximum**, puis reconnexion avec code TOTP.
- Trois applications = trois sessions séparées : un cookie du site client ne vaut rien sur `admin.`.

## 3. Comment la double authentification de l'équipe est appliquée

```
Connexion e-mail + mot de passe  →  jeton « aal1 »  →  la base traite la personne comme un simple client
                    │
                    ▼
Saisie du code TOTP              →  jeton « aal2 »  →  les rôles admin / moderator / support s'activent
```
C'est la base qui décide (`private.staff_session_ok()`), pas l'écran : même en appelant l'API Supabase
directement avec un mot de passe volé, un pirate n'obtient aucun droit d'administration.
Le back-office affiche l'écran de code grâce à `staff_mfa_status()` et `src/proxy.ts`.

## 4. Les rôles

| Rôle | Qui | Principe |
|---|---|---|
| `anon` | Visiteur | Lit le catalogue publié, les devis, la FAQ |
| `client` | Toute personne inscrite | Ses données, ses réservations, ses messages |
| `partner` : `owner` / `manager` / `agent` | Membres d'une agence | `agent` : opérations (remise, état des lieux), **pas** de prix ni de versement |
| `support` | Équipe | Lit réservations et tickets ; ne touche pas à l'argent |
| `moderator` | Équipe | Documents, KYC, annonces, signalements |
| `admin` | Équipe (2 personnes maximum au lancement) | Tout, y compris réglages, rôles, agents IA, audit |

## 5. Matrice des droits (extrait)

| Action | Client | Vendeur | Support | Modérateur | Admin |
|---|---|---|---|---|---|
| Voir une annonce publiée | ✅ | ✅ | ✅ | ✅ | ✅ |
| Publier une annonce | — | soumet seulement | — | ✅ | ✅ |
| Voir les coordonnées de l'autre partie | après confirmation | après confirmation | ✅ | ✅ | ✅ |
| Voir une pièce d'identité | la sienne | celle du conducteur, à la remise | — | ✅ (journalisé) | ✅ (journalisé) |
| Valider un KYC | — | — | — | ✅ | ✅ |
| Rembourser | — | — | — | — | ✅ (à deux au-delà du seuil) |
| Lancer un versement | — | — | — | — | ✅ |
| Modifier une commission | — | — | — | — | ✅ |
| Régler un agent IA | — | — | — | lecture | ✅ |
| Lire le journal d'audit | — | — | — | — | ✅ |

La matrice complète est appliquée par les 181 règles RLS de la base ; les tests `tests/*.sql` la vérifient.

## 6. L'API Render

Chaque requête porte le jeton Supabase de l'utilisateur. L'API :
1. vérifie la signature du jeton avec les clés publiques Supabase (JWKS) ;
2. lit le rôle et le niveau `aal` ;
3. applique les gardes : `@Roles('admin')` exige aussi `aal2` ;
4. appelle la base **avec le jeton de l'utilisateur** dès que possible (la RLS s'applique), et avec la clé
   secrète seulement pour les opérations serveur (webhooks, tâches).
