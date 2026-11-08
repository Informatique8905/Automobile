# 04 — Sécurité applicative (code partagé)

Paquet `@plateforme/securite-applicative`, importé par les 3 applications frontend et par l'API.
Une règle de sécurité n'est écrite qu'**une seule fois**, ici.

| Fichier | Ce qu'il fait | Utilisé par |
|---|---|---|
| `src/entetes.ts` | En-têtes HTTP (HSTS, CSP, anti-cadre, permissions) ; CSP stricte avec nonce pour le back-office | `next.config.ts` des 3 apps, `src/proxy.ts` du back-office |
| `src/webhooks.ts` | Vérification HMAC en temps constant, anti-rejeu par horodatage, comparaison de secrets | API : webhook Jeko, KYC, tâches internes |
| `src/fichiers.ts` | Vrai type d'un fichier (octets), tailles maximales par usage | API : photos, documents, états des lieux |
| `src/limites.ts` | Limites de requêtes par action | API (Throttler) |
| `src/webhooks.test.ts` | 9 tests | CI |

## Règles OWASP appliquées dans le projet

| Risque OWASP Top 10 | Réponse |
|---|---|
| A01 Contrôle d'accès défaillant | RLS sur toutes les tables, droits par colonne, gardes NestJS, aal2 pour l'équipe |
| A02 Défaillances cryptographiques | HTTPS/HSTS, chiffrement des comptes de versement, hachage de la liste noire |
| A03 Injection | Fonctions RPC paramétrées, aucun SQL concaténé, React échappe le texte, CSP |
| A04 Conception non sécurisée | Prix calculés en base, webhook = seule preuve de paiement, délai de carence |
| A05 Mauvaise configuration | Variables vérifiées au démarrage de l'API (`noyau/config/env.ts`), en-têtes centralisés |
| A06 Composants vulnérables | `pnpm audit`, Dependabot, Semgrep (CI) |
| A07 Authentification | Supabase Auth, CAPTCHA, double authentification, codes SMS |
| A08 Intégrité des données | Webhooks signés, audit inviolable, migrations versionnées |
| A09 Journalisation | `audit_logs`, `security_events`, journaux API sans données personnelles |
| A10 SSRF | L'API n'appelle que des domaines fixés en configuration (Jeko, FNE, KYC, IA) |
