# Application CLIENT — site public + espace client

**Adresse** : `www.votre-domaine.ci` · **Hébergement** : Vercel (un projet par application, dossier racine `1-FRONTEND/client`)

Ce que voit un visiteur et un client : accueil, catalogue, fiches véhicules, tunnel de réservation
et de paiement (Jeko), espace client. C'est la seule application **indexée par Google** : elle doit
être rapide sur un téléphone Android en 3G/4G.

## Règles de cette application
- **Lecture directe à Supabase** (clé publique) pour le catalogue, les fiches, la messagerie : la RLS filtre.
- **Prix toujours calculés par la base** (`quote_rental`) ; le navigateur n'envoie jamais de montant.
- **API Render** seulement pour : payer, vérifier son identité, télécharger contrat / facture / export.
- **Coordonnées du partenaire** affichées seulement après confirmation (`get_booking_contacts`).
- **Mobile d'abord** : composants pensés pour 360 px de large, puis adaptés au bureau.
- **Accessibilité WCAG 2.2 AA** : composants de `commun/ui` uniquement.

## Structure

```
client/
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
| `/code` | Saisie du code reçu (SMS / WhatsApp / application) | `src/app/(auth)/code/page.tsx` |
| `/connexion` | Connexion | `src/app/(auth)/connexion/page.tsx` |
| `/inscription` | Inscription | `src/app/(auth)/inscription/page.tsx` |
| `/mot-de-passe-oublie` | Mot de passe oublié | `src/app/(auth)/mot-de-passe-oublie/page.tsx` |
| `/` | Accueil | `src/app/(public)/page.tsx` |
| `/a-propos` | À propos | `src/app/(public)/a-propos/page.tsx` |
| `/comparateur?ids=…` | Comparateur de véhicules | `src/app/(public)/comparateur/page.tsx` |
| `/contact` | Contact et support | `src/app/(public)/contact/page.tsx` |
| `/faq` | FAQ | `src/app/(public)/faq/page.tsx` |
| `/legal/cgu | confidentialite | cookies | mentions` | Documents légaux | `src/app/(public)/legal/[document]/page.tsx` |
| `/location-voiture/abidjan` | Page référencée « Location de voiture à [ville] » | `src/app/(public)/location-voiture/[ville]/page.tsx` |
| `/partenaires/[slug]` | Profil public d'un partenaire | `src/app/(public)/partenaires/[slug]/page.tsx` |
| `/recherche` | Catalogue (résultats de recherche) | `src/app/(public)/recherche/page.tsx` |
| `/vehicules/[slug]` | Fiche véhicule | `src/app/(public)/vehicules/[slug]/page.tsx` |
| `/vendre` | Vendre ou louer mon véhicule | `src/app/(public)/vendre/page.tsx` |
| `/vente-voiture/abidjan` | Page référencée « Voitures à vendre à [ville] » | `src/app/(public)/vente-voiture/[ville]/page.tsx` |
| `/acompte/[annonce]` | Vente — acompte de réservation | `src/app/acompte/[annonce]/page.tsx` |
| `?` | Retour de Google / Apple / lien e-mail | `src/app/auth/callback/route.ts` |
| `/compte` | Espace client — tableau de bord | `src/app/compte/page.tsx` |
| `/compte/achats` | Mes achats (essais, acomptes) | `src/app/compte/achats/page.tsx` |
| `/compte/alertes` | Mes alertes de recherche | `src/app/compte/alertes/page.tsx` |
| `/compte/documents` | Vérification et documents (coffre-fort) | `src/app/compte/documents/page.tsx` |
| `/compte/factures` | Paiements et factures | `src/app/compte/factures/page.tsx` |
| `/compte/favoris` | Mes favoris | `src/app/compte/favoris/page.tsx` |
| `/compte/mes-donnees` | Mes données personnelles | `src/app/compte/mes-donnees/page.tsx` |
| `/compte/messages` | Messagerie — boîte de réception | `src/app/compte/messages/page.tsx` |
| `/compte/messages/[id]` | Messagerie — conversation | `src/app/compte/messages/[id]/page.tsx` |
| `/compte/notifications` | Notifications et préférences | `src/app/compte/notifications/page.tsx` |
| `/compte/profil` | Mon profil | `src/app/compte/profil/page.tsx` |
| `/compte/reservations` | Mes réservations | `src/app/compte/reservations/page.tsx` |
| `/compte/reservations/[id]` | Détail d'une réservation | `src/app/compte/reservations/[id]/page.tsx` |
| `/compte/securite` | Sécurité du compte | `src/app/compte/securite/page.tsx` |
| `/essai/[annonce]` | Vente — réserver un essai | `src/app/essai/[annonce]/page.tsx` |
| `/paiement/retour?ref=…` | Retour de la page de paiement Jeko | `src/app/paiement/retour/page.tsx` |
| `/reservation/[reference]/confirmation` | Réservation — d) Confirmation | `src/app/reservation/[reference]/confirmation/page.tsx` |
| `/reserver/[annonce]/conducteur` | Réservation — b) Conducteur et vérification d'identité | `src/app/reserver/[annonce]/conducteur/page.tsx` |
| `/reserver/[annonce]/options` | Réservation — a) Options et assurances | `src/app/reserver/[annonce]/options/page.tsx` |
| `/reserver/[annonce]/paiement` | Réservation — c) Récapitulatif détaillé et paiement | `src/app/reserver/[annonce]/paiement/page.tsx` |

## Les composants

| Composant | Rôle |
|---|---|
| `accueil/BarreNavigation.tsx` | Navigation supérieure |
| `accueil/BlocReassurance.tsx` | Bloc de réassurance |
| `accueil/CategoriesVisuelles.tsx` | Catégories visuelles |
| `accueil/MoteurRecherche.tsx` | Moteur de recherche à onglets |
| `accueil/OffresDuMoment.tsx` | Offres du moment (location) |
| `accueil/SectionALaUne.tsx` | Véhicules à la une (vente) |
| `catalogue/BarreComparateur.tsx` | Barre du comparateur (2-3 véhicules) |
| `catalogue/CarteVehicule.tsx` | Carte produit |
| `catalogue/FiltresRapides.tsx` | Filtres pilules |
| `catalogue/PanneauFiltres.tsx` | Panneau de filtres avancés |
| `catalogue/SelecteurTri.tsx` | Tri des résultats |
| `catalogue/VueCarte.tsx` | Vue carte des résultats |
| `catalogue/ZeroResultat.tsx` | Aucun résultat |
| `commun/BandeauCookies.tsx` | Bandeau de consentement cookies |
| `compte/CoffreFort.tsx` | Coffre-fort de documents |
| `compte/FilMessages.tsx` | Fil de messages temps réel |
| `compte/HistoriqueActivites.tsx` | Historique des activités |
| `compte/SmartCards.tsx` | Rappels contextuels |
| `compte/StatutValidation.tsx` | Statut de validation (en attente / validé / refusé) |
| `fiche/BlocConversionLocation.tsx` | Bloc de conversion — location |
| `fiche/BlocConversionVente.tsx` | Bloc de conversion — vente |
| `fiche/ConditionsDocuments.tsx` | Conditions et documents téléchargeables |
| `fiche/EnteteInfos.tsx` | En-tête et infos rapides |
| `fiche/GalerieMedias.tsx` | Galerie médias |
| `fiche/GrilleEquipements.tsx` | Grille d'équipements |
| `fiche/ProfilPartenaire.tsx` | Profil du vendeur / hôte |
| `fiche/SimulateurCredit.tsx` | Simulateur d'échéances de crédit |
| `tunnel/BarreProgression.tsx` | Barre de progression a → d |
| `tunnel/BoutonPayerJeko.tsx` | Bouton « Payer » (redirection Jeko) |
| `tunnel/ChoixAssurance.tsx` | Choix de la formule d'assurance |
| `tunnel/ChoixCaution.tsx` | Mode de caution |
| `tunnel/EcranConfirmation.tsx` | Écran de confirmation + QR code |
| `tunnel/OptionsServices.tsx` | Équipements et services additionnels |
| `tunnel/RecapDetaille.tsx` | Récapitulatif détaillé des coûts |
| `tunnel/RecapExpress.tsx` | Récapitulatif express |
| `tunnel/VerificationIdentite.tsx` | Vérification d'identité (KYC) |

Chaque fichier commence par un en-tête : **contenu, données utilisées (tables, fonctions RPC, API),
règles de sécurité, tâches à faire**. Commencez par lire l'en-tête avant d'écrire le code.
