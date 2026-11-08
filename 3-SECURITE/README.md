# 3-SECURITE — la sécurité de la plateforme

La sécurité n'est pas une couche qu'on ajoute à la fin : elle est rangée ici, à part, pour être **visible,
vérifiable et testée**. Chaque dossier répond à une question.

| Dossier | La question | Contenu |
|---|---|---|
| `01-modele-de-menaces/` | Qui peut nous attaquer, comment ? | Les 16 menaces propres à une marketplace de véhicules à Abidjan, et leurs parades |
| `02-authentification-et-acces/` | Qui a le droit de faire quoi ? | Rôles, double authentification, sessions, matrice client / vendeur / administrateur |
| `03-protection-des-donnees/` | Que fait-on des données personnelles ? | Loi 2013-450, ARTCI, classification, chiffrement, conservation, registre des traitements |
| `04-securite-applicative/` | Comment le code se protège-t-il ? | **Code partagé** : en-têtes HTTP, limites de requêtes, contrôle des fichiers, webhooks signés |
| `05-agents-ia/` | Comment l'IA surveille-t-elle la plateforme ? | **Code** des 10 agents + garde-fous + synthèse quotidienne |
| `06-surveillance-et-alertes/` | Comment sait-on qu'il se passe quelque chose ? | Journaux, alertes, tableaux de bord |
| `07-reponse-aux-incidents/` | Que fait-on quand ça arrive ? | Plans d'action pas à pas (clé volée, compte admin piraté, fraude, fuite de données) |
| `08-tests-de-securite/` | Comment le prouve-t-on ? | Tests RLS, scans automatiques, test d'intrusion |
| `09-checklists/` | Qu'est-ce qu'on vérifie, et quand ? | Avant le lancement, chaque mois, chaque nouvelle fonctionnalité |

## La défense en profondeur (7 couches)

Une attaque doit franchir **toutes** les couches pour réussir. Si l'une cède, les autres tiennent.

```
 1. Réseau        Vercel / Render : HTTPS, pare-feu, anti-DDoS
 2. Navigateur    En-têtes de sécurité, CSP (04-securite-applicative/src/entetes.ts)
 3. Identité      Supabase Auth : mot de passe + code SMS/TOTP, double authentification OBLIGATOIRE pour l'équipe
 4. API           Jeton vérifié (JWKS), rôles, limites de requêtes, webhooks signés, secrets uniquement ici
 5. Base          RLS sur 86 tables, droits colonne par colonne, fonctions contrôlées, audit inviolable
 6. Données       Documents en espaces privés, liens signés courts, chiffrement, hachage, minimisation
 7. Détection     Agents IA, journal de sécurité, signaux de fraude, synthèse quotidienne, alertes
```

## Où chaque protection est codée

| Protection | Fichier |
|---|---|
| Double authentification de l'équipe | `2-BACKEND/base-de-donnees/supabase/migrations/20261106000200_mfa_equipe.sql` + `1-FRONTEND/administrateur/src/proxy.ts` |
| Contrôle du montant des paiements Jeko | `…/migrations/20261106000100_paiement_jeko.sql` + `2-BACKEND/api/src/modules/commun/paiements-jeko/` |
| Vérification des webhooks | `04-securite-applicative/src/webhooks.ts` |
| En-têtes HTTP / CSP | `04-securite-applicative/src/entetes.ts` |
| Fichiers envoyés | `04-securite-applicative/src/fichiers.ts` |
| Limites de requêtes | `04-securite-applicative/src/limites.ts` |
| Délai de carence des comptes de versement | `…/migrations/20261106000500_agents_ia_securite.sql` |
| Journal d'audit inviolable | idem |
| Agents IA | `05-agents-ia/` |
| Vérification du jeton dans l'API | `2-BACKEND/api/src/noyau/auth/` |
| Secrets absents du frontend | `.github/workflows/securite.yml` (contrôle automatique) |

## Tests qui prouvent que ça marche

```bash
./2-BACKEND/base-de-donnees/scripts/test-db.sh        # 34 scénarios dont 9 de sécurité ajoutés
pnpm --filter @plateforme/securite-applicative test    # 9 tests (signatures, fichiers, CSP)
pnpm --filter @plateforme/agents-ia test               # 9 tests (injection de prompt, JSON invalide…)
```
