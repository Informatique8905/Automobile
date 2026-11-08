# Application ADMINISTRATEUR — back-office de l'équipe

**Adresse** : `admin.votre-domaine.ci` · **Hébergement** : Vercel (un projet par application, dossier racine `1-FRONTEND/administrateur`)

Pour l'équipe interne : modération, vérification d'identité, validation des partenaires, litiges,
argent (paiements, remboursements, cautions, versements, factures FNE), support, sécurité (agents IA,
fraude, journal, incidents, vie privée, audit), référentiels, contenus, réglages.

## Règles de cette application
- **Double authentification obligatoire** : `src/proxy.ts` (confort) + la base (`private.staff_session_ok`, protection réelle).
- **CSP stricte avec nonce**, aucune ressource tierce, `Cache-Control: no-store`, session de 8 h.
- **Domaine séparé** : aucune session partagée avec le site client.
- **Documents sensibles** : liens signés de 5 minutes, filigrane, consultation journalisée.
- **Argent** : remboursements au-delà du seuil validés par une 2ᵉ personne.
- **2 administrateurs maximum** au lancement ; les autres membres ont `moderator` ou `support`.

## Structure

```
administrateur/
├── src/
│   ├── app/           ← les pages (une page = un dossier avec page.tsx)
│   ├── composants/    ← les morceaux d'écran propres à cette application
│   ├── lib/           ← appels à l'API, utilitaires
│   └── proxy.ts       ← session + redirections (Next.js 16, anciennement middleware.ts)
├── next.config.ts     ← en-têtes de sécurité (3-SECURITE/04)
├── vercel.json
└── .env.example       ← uniquement des valeurs publiques
```

## Les écrans

| Adresse | Écran | Fichier |
|---|---|---|
| `/` | Tableau de bord de l'équipe | `src/app/page.tsx` |
| `/activer-2fa` | Activation de la double authentification | `src/app/activer-2fa/page.tsx` |
| `/argent/cautions` | Cautions | `src/app/argent/cautions/page.tsx` |
| `/argent/factures` | Factures et certification FNE | `src/app/argent/factures/page.tsx` |
| `/argent/paiements` | Paiements Jeko | `src/app/argent/paiements/page.tsx` |
| `/argent/remboursements` | Remboursements | `src/app/argent/remboursements/page.tsx` |
| `/argent/versements` | Versements aux partenaires | `src/app/argent/versements/page.tsx` |
| `/connexion` | Connexion de l'équipe | `src/app/connexion/page.tsx` |
| `/contenus` | Contenus | `src/app/contenus/page.tsx` |
| `/equipe` | Équipe interne et rôles | `src/app/equipe/page.tsx` |
| `/kyc` | Vérifications d'identité — file | `src/app/kyc/page.tsx` |
| `/kyc/[id]` | Vérification d'identité — décision | `src/app/kyc/[id]/page.tsx` |
| `/litiges` | Litiges | `src/app/litiges/page.tsx` |
| `/litiges/[id]` | Litige — instruction et décision | `src/app/litiges/[id]/page.tsx` |
| `/moderation` | Modération — file unifiée | `src/app/moderation/page.tsx` |
| `/moderation/annonces` | Modération — annonces | `src/app/moderation/annonces/page.tsx` |
| `/moderation/avis` | Modération — avis | `src/app/moderation/avis/page.tsx` |
| `/moderation/messages` | Modération — messages signalés | `src/app/moderation/messages/page.tsx` |
| `/moderation/photos` | Modération — photos | `src/app/moderation/photos/page.tsx` |
| `/partenaires` | Partenaires | `src/app/partenaires/page.tsx` |
| `/partenaires/[id]` | Partenaire — validation KYB | `src/app/partenaires/[id]/page.tsx` |
| `/referentiels` | Référentiels | `src/app/referentiels/page.tsx` |
| `/reglages` | Réglages de la plateforme | `src/app/reglages/page.tsx` |
| `/reservations` | Réservations | `src/app/reservations/page.tsx` |
| `/securite` | Sécurité — tableau de bord | `src/app/securite/page.tsx` |
| `/securite/agents-ia` | Sécurité — pilotage des agents IA | `src/app/securite/agents-ia/page.tsx` |
| `/securite/audit` | Journal d'audit | `src/app/securite/audit/page.tsx` |
| `/securite/fraude` | Sécurité — signaux de fraude | `src/app/securite/fraude/page.tsx` |
| `/securite/incidents` | Sécurité — registre des violations de données | `src/app/securite/incidents/page.tsx` |
| `/securite/journal` | Sécurité — journal des connexions | `src/app/securite/journal/page.tsx` |
| `/securite/vie-privee` | Demandes « vie privée » | `src/app/securite/vie-privee/page.tsx` |
| `/support` | Support — tickets | `src/app/support/page.tsx` |
| `/utilisateurs` | Utilisateurs | `src/app/utilisateurs/page.tsx` |
| `/utilisateurs/[id]` | Utilisateur — fiche | `src/app/utilisateurs/[id]/page.tsx` |
| `/verification` | Saisie du code TOTP | `src/app/verification/page.tsx` |

## Les composants

| Composant | Rôle |
|---|---|
| `ConfirmationDouble.tsx` | Validation à deux personnes |
| `DecisionKyc.tsx` | Formulaire de décision KYC |
| `FileDeRevue.tsx` | File de revue générique (tri, priorité, prise en charge) |
| `GraphiquesSecurite.tsx` | Graphiques de sécurité |
| `JournalAudit.tsx` | Lecture du journal d'audit |
| `PanneauAgentIa.tsx` | Réglage d'un agent IA |
| `VisionneuseDocument.tsx` | Visionneuse de document sensible |

Chaque fichier commence par un en-tête : **contenu, données utilisées (tables, fonctions RPC, API),
règles de sécurité, tâches à faire**. Commencez par lire l'en-tête avant d'écrire le code.
