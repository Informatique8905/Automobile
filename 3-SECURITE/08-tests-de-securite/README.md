# 08 — Tests de sécurité

| Test | Quand | Commande / outil |
|---|---|---|
| **Règles d'accès de la base** (RLS, droits, double authentification, Jeko, audit) | Chaque modification, en CI | `./2-BACKEND/base-de-donnees/scripts/test-db.sh` (+ `STRICT=1`) |
| Paquet de sécurité (signatures, fichiers, CSP) | CI | `pnpm --filter @plateforme/securite-applicative test` |
| Agents IA (injection de prompt, JSON invalide, règles) | CI | `pnpm --filter @plateforme/agents-ia test` |
| Secrets dans le dépôt | CI | gitleaks |
| Clé secrète dans le frontend | CI | job `cle-secrete-frontend` |
| Dépendances vulnérables | CI + chaque lundi | `pnpm audit`, Dependabot |
| Analyse statique | CI | Semgrep (OWASP, TypeScript, secrets) |
| Scan dynamique de la recette | Chaque lundi | OWASP ZAP (baseline) |
| Conseiller de sécurité Supabase | Chaque mois | Tableau de bord Supabase |
| **Test d'intrusion** par un prestataire | Avant le lancement public, puis 1×/an | Prestataire externe |

## Règle : chaque faille corrigée = un test ajouté

Exemple : le test « un admin sans code TOTP n'a aucun droit » (scénario 27) a été ajouté avec la migration
qui corrige ce point. Il échouera si quelqu'un réintroduit le problème.

## À tester à la main avant le lancement (extrait)

- [ ] Modifier le montant dans la requête de paiement depuis le navigateur → refusé
- [ ] Rejouer un ancien webhook Jeko → ignoré (horodatage + idempotence)
- [ ] Ouvrir l'URL d'une pièce d'identité d'un autre utilisateur → refusé
- [ ] Se connecter au back-office sans code TOTP → aucun écran d'administration
- [ ] Envoyer un fichier `.jpg` qui est un script → refusé
- [ ] Écrire « paie-moi par Wave » dans la messagerie → message signalé
