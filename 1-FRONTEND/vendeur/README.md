# Application VENDEUR — espace partenaire

**Adresse** : `pro.votre-domaine.ci` · **Hébergement** : Vercel (un projet par application, dossier racine `1-FRONTEND/vendeur`)

Pour les agences de location, les particuliers loueurs, les concessionnaires et les particuliers
vendeurs : devenir partenaire, gérer la flotte et les annonces, accepter les réservations, remettre
les véhicules (QR code + état des lieux), suivre les revenus et les versements.

## Règles de cette application
- **Non indexée** par les moteurs de recherche.
- **Rôles d'équipe** : `owner` (tout), `manager` (tout sauf l'équipe), `agent` (opérations : remise,
  état des lieux — pas de prix, pas de versement). La base revérifie chaque action.
- **Publication** : un partenaire soumet ; l'IA puis un modérateur publient.
- **Comptes de versement** : envoyés à l'API (chiffrement), utilisables 72 h après ajout.
- **Double authentification** proposée et rappelée au propriétaire tant qu'elle n'est pas activée.

## Structure

```
vendeur/
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
| `/annonces` | Mes annonces | `src/app/annonces/page.tsx` |
| `/annonces/[id]` | Éditeur d'annonce | `src/app/annonces/[id]/page.tsx` |
| `/avis` | Avis reçus | `src/app/avis/page.tsx` |
| `/calendrier` | Calendrier de disponibilité | `src/app/calendrier/page.tsx` |
| `/connexion` | Connexion partenaire | `src/app/connexion/page.tsx` |
| `/devenir-partenaire` | Devenir partenaire (inscription KYB) | `src/app/devenir-partenaire/page.tsx` |
| `/equipe` | Mon équipe | `src/app/equipe/page.tsx` |
| `/etats-des-lieux/[reservation]` | État des lieux départ / retour | `src/app/etats-des-lieux/[reservation]/page.tsx` |
| `/factures` | Factures et relevés | `src/app/factures/page.tsx` |
| `/flotte` | Gestion de flotte | `src/app/flotte/page.tsx` |
| `/flotte/[vehicule]` | Fiche véhicule (partenaire) | `src/app/flotte/[vehicule]/page.tsx` |
| `/flotte/nouveau` | Ajouter un véhicule | `src/app/flotte/nouveau/page.tsx` |
| `/messages` | Messagerie partenaire | `src/app/messages/page.tsx` |
| `/profil-public` | Profil public et agences | `src/app/profil-public/page.tsx` |
| `/remise` | Remise du véhicule (scanner le QR code) | `src/app/remise/page.tsx` |
| `/reservations` | Réservations reçues | `src/app/reservations/page.tsx` |
| `/reservations/[id]` | Détail d'une réservation (partenaire) | `src/app/reservations/[id]/page.tsx` |
| `/securite` | Sécurité du compte partenaire | `src/app/securite/page.tsx` |
| `/tableau-de-bord` | Tableau de bord business | `src/app/tableau-de-bord/page.tsx` |
| `/ventes` | Ventes : essais, acomptes, financements | `src/app/ventes/page.tsx` |
| `/ventes/[id]` | Détail d'une vente | `src/app/ventes/[id]/page.tsx` |
| `/versements` | Versements et comptes de versement | `src/app/versements/page.tsx` |

## Les composants

| Composant | Rôle |
|---|---|
| `CalendrierDisponibilite.tsx` | Calendrier de disponibilité |
| `EditeurAnnonce.tsx` | Éditeur d'annonce |
| `EtatDesLieuxPhotos.tsx` | Prise de photos guidée (état des lieux) |
| `FormulaireCompteVersement.tsx` | Ajout d'un compte de versement |
| `GlisserDeposerPhotos.tsx` | Photos par glisser-déposer |
| `ListeTaches.tsx` | To-do list automatisée |
| `ScannerQr.tsx` | Scanner de QR code |
| `StatutFlotte.tsx` | Pastilles de statut de flotte |
| `TableauKpi.tsx` | Indicateurs clés |

Chaque fichier commence par un en-tête : **contenu, données utilisées (tables, fonctions RPC, API),
règles de sécurité, tâches à faire**. Commencez par lire l'en-tête avant d'écrire le code.
