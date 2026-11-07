# 1-FRONTEND/commun — paquets partagés

| Paquet | Nom | Rôle | Utilisé par |
|---|---|---|---|
| `ui/` | `@plateforme/ui` | Composants accessibles + `jetons.css` (couleurs, espacements) | 3 apps |
| `supabase/` | `@plateforme/supabase` | `clientNavigateur()`, `clientServeur()`, `rafraichirSession()` — **clé publique uniquement** | 3 apps |
| `types/` | `@plateforme/types` | Types générés depuis la base (`pnpm db:types` après chaque migration) | 3 apps |
| `validation/` | `@plateforme/validation` | Schémas zod : `telephoneCI`, `montantXOF`, `periodeLocation`, `inscription`, `filtresCatalogue` | 3 apps **+ API** |
| `i18n/` | `@plateforme/i18n` | `traduireErreur(code)` pour les 87 codes de la base et de l'API | 3 apps |
| `config/` | `@plateforme/config` | `tsconfig.base.json`, ESLint (interdit `eval`, `dangerouslySetInnerHTML`) | tout le dépôt |

Règle : un élément utilisé par **deux applications ou plus** va ici ; sinon il reste dans l'application.
Le futur dossier `1-FRONTEND/mobile` (application native Expo, phase 3) réutilisera `types`, `validation` et `i18n`.
