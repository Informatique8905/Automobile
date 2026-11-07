# Structure complète du projet

*Générée à partir des en-têtes des fichiers : chaque ligne indique le rôle du fichier.*

Trois grandes parties : **1-FRONTEND** (ce que voient les utilisateurs), **2-BACKEND** (les serveurs et la base),
**3-SECURITE** (les protections, rangées à part). Dans le frontend comme dans le backend, on retrouve
les trois espaces : **client**, **vendeur**, **administrateur**.

---

## 1-FRONTEND — Vercel

### 1.1 Client — `www.votre-domaine.ci`
```
├── app/
│   ├── (auth)/
│   │   ├── code/
│   │   │   └── page.tsx   ← Saisie du code reçu (SMS / WhatsApp / application)
│   │   ├── connexion/
│   │   │   └── page.tsx   ← Connexion
│   │   ├── inscription/
│   │   │   └── page.tsx   ← Inscription
│   │   └── mot-de-passe-oublie/
│   │       └── page.tsx   ← Mot de passe oublié
│   ├── (public)/
│   │   ├── a-propos/
│   │   │   └── page.tsx   ← À propos
│   │   ├── comparateur/
│   │   │   └── page.tsx   ← Comparateur de véhicules
│   │   ├── contact/
│   │   │   └── page.tsx   ← Contact et support
│   │   ├── faq/
│   │   │   └── page.tsx   ← FAQ
│   │   ├── legal/
│   │   │   └── [document]/
│   │   │       └── page.tsx   ← Documents légaux
│   │   ├── location-voiture/
│   │   │   └── [ville]/
│   │   │       └── page.tsx   ← Page référencée « Location de voiture à [ville] »
│   │   ├── partenaires/
│   │   │   └── [slug]/
│   │   │       └── page.tsx   ← Profil public d'un partenaire
│   │   ├── recherche/
│   │   │   └── page.tsx   ← Catalogue (résultats de recherche)
│   │   ├── vehicules/
│   │   │   └── [slug]/
│   │   │       └── page.tsx   ← Fiche véhicule
│   │   ├── vendre/
│   │   │   └── page.tsx   ← Vendre ou louer mon véhicule
│   │   ├── vente-voiture/
│   │   │   └── [ville]/
│   │   │       └── page.tsx   ← Page référencée « Voitures à vendre à [ville] »
│   │   └── page.tsx   ← Accueil
│   ├── acompte/
│   │   └── [annonce]/
│   │       └── page.tsx   ← Vente — acompte de réservation
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts   ← Retour de Google / Apple / lien e-mail
│   ├── compte/
│   │   ├── achats/
│   │   │   └── page.tsx   ← Mes achats (essais, acomptes)
│   │   ├── alertes/
│   │   │   └── page.tsx   ← Mes alertes de recherche
│   │   ├── documents/
│   │   │   └── page.tsx   ← Vérification et documents (coffre-fort)
│   │   ├── factures/
│   │   │   └── page.tsx   ← Paiements et factures
│   │   ├── favoris/
│   │   │   └── page.tsx   ← Mes favoris
│   │   ├── mes-donnees/
│   │   │   └── page.tsx   ← Mes données personnelles
│   │   ├── messages/
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx   ← Messagerie — conversation
│   │   │   └── page.tsx   ← Messagerie — boîte de réception
│   │   ├── notifications/
│   │   │   └── page.tsx   ← Notifications et préférences
│   │   ├── profil/
│   │   │   └── page.tsx   ← Mon profil
│   │   ├── reservations/
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx   ← Détail d'une réservation
│   │   │   └── page.tsx   ← Mes réservations
│   │   ├── securite/
│   │   │   └── page.tsx   ← Sécurité du compte
│   │   └── page.tsx   ← Espace client — tableau de bord
│   ├── essai/
│   │   └── [annonce]/
│   │       └── page.tsx   ← Vente — réserver un essai
│   ├── paiement/
│   │   └── retour/
│   │       └── page.tsx   ← Retour de la page de paiement Jeko
│   ├── reservation/
│   │   └── [reference]/
│   │       └── confirmation/
│   │           └── page.tsx   ← Réservation — d) Confirmation
│   ├── reserver/
│   │   └── [annonce]/
│   │       ├── conducteur/
│   │       │   └── page.tsx   ← Réservation — b) Conducteur et vérification d'identité
│   │       ├── options/
│   │       │   └── page.tsx   ← Réservation — a) Options et assurances
│   │       └── paiement/
│   │           └── page.tsx   ← Réservation — c) Récapitulatif détaillé et paiement
│   ├── layout.tsx   ← Mise en page racine
│   ├── manifest.ts   ← Manifeste PWA (application installable)
│   ├── robots.ts   ← robots.txt
│   └── sitemap.ts   ← Plan du site pour Google
├── composants/
│   ├── accueil/
│   │   ├── BarreNavigation.tsx   ← Navigation supérieure
│   │   ├── BlocReassurance.tsx   ← Bloc de réassurance
│   │   ├── CategoriesVisuelles.tsx   ← Catégories visuelles
│   │   ├── MoteurRecherche.tsx   ← Moteur de recherche à onglets
│   │   ├── OffresDuMoment.tsx   ← Offres du moment (location)
│   │   └── SectionALaUne.tsx   ← Véhicules à la une (vente)
│   ├── catalogue/
│   │   ├── BarreComparateur.tsx   ← Barre du comparateur (2-3 véhicules)
│   │   ├── CarteVehicule.tsx   ← Carte produit
│   │   ├── FiltresRapides.tsx   ← Filtres pilules
│   │   ├── PanneauFiltres.tsx   ← Panneau de filtres avancés
│   │   ├── SelecteurTri.tsx   ← Tri des résultats
│   │   ├── VueCarte.tsx   ← Vue carte des résultats
│   │   └── ZeroResultat.tsx   ← Aucun résultat
│   ├── commun/
│   │   └── BandeauCookies.tsx   ← Bandeau de consentement cookies
│   ├── compte/
│   │   ├── CoffreFort.tsx   ← Coffre-fort de documents
│   │   ├── FilMessages.tsx   ← Fil de messages temps réel
│   │   ├── HistoriqueActivites.tsx   ← Historique des activités
│   │   ├── SmartCards.tsx   ← Rappels contextuels
│   │   └── StatutValidation.tsx   ← Statut de validation (en attente / validé / refusé)
│   ├── fiche/
│   │   ├── BlocConversionLocation.tsx   ← Bloc de conversion — location
│   │   ├── BlocConversionVente.tsx   ← Bloc de conversion — vente
│   │   ├── ConditionsDocuments.tsx   ← Conditions et documents téléchargeables
│   │   ├── EnteteInfos.tsx   ← En-tête et infos rapides
│   │   ├── GalerieMedias.tsx   ← Galerie médias
│   │   ├── GrilleEquipements.tsx   ← Grille d'équipements
│   │   ├── ProfilPartenaire.tsx   ← Profil du vendeur / hôte
│   │   └── SimulateurCredit.tsx   ← Simulateur d'échéances de crédit
│   └── tunnel/
│       ├── BarreProgression.tsx   ← Barre de progression a → d
│       ├── BoutonPayerJeko.tsx   ← Bouton « Payer » (redirection Jeko)
│       ├── ChoixAssurance.tsx   ← Choix de la formule d'assurance
│       ├── ChoixCaution.tsx   ← Mode de caution
│       ├── EcranConfirmation.tsx   ← Écran de confirmation + QR code
│       ├── OptionsServices.tsx   ← Équipements et services additionnels
│       ├── RecapDetaille.tsx   ← Récapitulatif détaillé des coûts
│       ├── RecapExpress.tsx   ← Récapitulatif express
│       └── VerificationIdentite.tsx   ← Vérification d'identité (KYC)
├── lib/
│   └── api.ts   ← Appels à l'API Render (avec le jeton de l'utilisateur)
└── proxy.ts   ← PROXY (Next.js 16, anciennement « middleware ») · application client
```

### 1.2 Vendeur — `pro.votre-domaine.ci`
```
├── app/
│   ├── annonces/
│   │   ├── [id]/
│   │   │   └── page.tsx   ← Éditeur d'annonce
│   │   └── page.tsx   ← Mes annonces
│   ├── avis/
│   │   └── page.tsx   ← Avis reçus
│   ├── calendrier/
│   │   └── page.tsx   ← Calendrier de disponibilité
│   ├── connexion/
│   │   └── page.tsx   ← Connexion partenaire
│   ├── devenir-partenaire/
│   │   └── page.tsx   ← Devenir partenaire (inscription KYB)
│   ├── equipe/
│   │   └── page.tsx   ← Mon équipe
│   ├── etats-des-lieux/
│   │   └── [reservation]/
│   │       └── page.tsx   ← État des lieux départ / retour
│   ├── factures/
│   │   └── page.tsx   ← Factures et relevés
│   ├── flotte/
│   │   ├── [vehicule]/
│   │   │   └── page.tsx   ← Fiche véhicule (partenaire)
│   │   ├── nouveau/
│   │   │   └── page.tsx   ← Ajouter un véhicule
│   │   └── page.tsx   ← Gestion de flotte
│   ├── messages/
│   │   └── page.tsx   ← Messagerie partenaire
│   ├── profil-public/
│   │   └── page.tsx   ← Profil public et agences
│   ├── remise/
│   │   └── page.tsx   ← Remise du véhicule (scanner le QR code)
│   ├── reservations/
│   │   ├── [id]/
│   │   │   └── page.tsx   ← Détail d'une réservation (partenaire)
│   │   └── page.tsx   ← Réservations reçues
│   ├── securite/
│   │   └── page.tsx   ← Sécurité du compte partenaire
│   ├── tableau-de-bord/
│   │   └── page.tsx   ← Tableau de bord business
│   ├── ventes/
│   │   ├── [id]/
│   │   │   └── page.tsx   ← Détail d'une vente
│   │   └── page.tsx   ← Ventes : essais, acomptes, financements
│   ├── versements/
│   │   └── page.tsx   ← Versements et comptes de versement
│   └── layout.tsx   ← Mise en page de l'espace partenaire
├── composants/
│   ├── CalendrierDisponibilite.tsx   ← Calendrier de disponibilité
│   ├── EditeurAnnonce.tsx   ← Éditeur d'annonce
│   ├── EtatDesLieuxPhotos.tsx   ← Prise de photos guidée (état des lieux)
│   ├── FormulaireCompteVersement.tsx   ← Ajout d'un compte de versement
│   ├── GlisserDeposerPhotos.tsx   ← Photos par glisser-déposer
│   ├── ListeTaches.tsx   ← To-do list automatisée
│   ├── ScannerQr.tsx   ← Scanner de QR code
│   ├── StatutFlotte.tsx   ← Pastilles de statut de flotte
│   └── TableauKpi.tsx   ← Indicateurs clés
├── lib/
│   └── api.ts   ← Appels à l'API Render (avec le jeton de l'utilisateur)
└── proxy.ts   ← PROXY (Next.js 16) · application vendeur
```

### 1.3 Administrateur — `admin.votre-domaine.ci`
```
├── app/
│   ├── activer-2fa/
│   │   └── page.tsx   ← Activation de la double authentification
│   ├── argent/
│   │   ├── cautions/
│   │   │   └── page.tsx   ← Cautions
│   │   ├── factures/
│   │   │   └── page.tsx   ← Factures et certification FNE
│   │   ├── paiements/
│   │   │   └── page.tsx   ← Paiements Jeko
│   │   ├── remboursements/
│   │   │   └── page.tsx   ← Remboursements
│   │   └── versements/
│   │       └── page.tsx   ← Versements aux partenaires
│   ├── connexion/
│   │   └── page.tsx   ← Connexion de l'équipe
│   ├── contenus/
│   │   └── page.tsx   ← Contenus
│   ├── equipe/
│   │   └── page.tsx   ← Équipe interne et rôles
│   ├── kyc/
│   │   ├── [id]/
│   │   │   └── page.tsx   ← Vérification d'identité — décision
│   │   └── page.tsx   ← Vérifications d'identité — file
│   ├── litiges/
│   │   ├── [id]/
│   │   │   └── page.tsx   ← Litige — instruction et décision
│   │   └── page.tsx   ← Litiges
│   ├── moderation/
│   │   ├── annonces/
│   │   │   └── page.tsx   ← Modération — annonces
│   │   ├── avis/
│   │   │   └── page.tsx   ← Modération — avis
│   │   ├── messages/
│   │   │   └── page.tsx   ← Modération — messages signalés
│   │   ├── photos/
│   │   │   └── page.tsx   ← Modération — photos
│   │   └── page.tsx   ← Modération — file unifiée
│   ├── partenaires/
│   │   ├── [id]/
│   │   │   └── page.tsx   ← Partenaire — validation KYB
│   │   └── page.tsx   ← Partenaires
│   ├── referentiels/
│   │   └── page.tsx   ← Référentiels
│   ├── reglages/
│   │   └── page.tsx   ← Réglages de la plateforme
│   ├── reservations/
│   │   └── page.tsx   ← Réservations
│   ├── securite/
│   │   ├── agents-ia/
│   │   │   └── page.tsx   ← Sécurité — pilotage des agents IA
│   │   ├── audit/
│   │   │   └── page.tsx   ← Journal d'audit
│   │   ├── fraude/
│   │   │   └── page.tsx   ← Sécurité — signaux de fraude
│   │   ├── incidents/
│   │   │   └── page.tsx   ← Sécurité — registre des violations de données
│   │   ├── journal/
│   │   │   └── page.tsx   ← Sécurité — journal des connexions
│   │   ├── vie-privee/
│   │   │   └── page.tsx   ← Demandes « vie privée »
│   │   └── page.tsx   ← Sécurité — tableau de bord
│   ├── support/
│   │   └── page.tsx   ← Support — tickets
│   ├── utilisateurs/
│   │   ├── [id]/
│   │   │   └── page.tsx   ← Utilisateur — fiche
│   │   └── page.tsx   ← Utilisateurs
│   ├── verification/
│   │   └── page.tsx   ← Saisie du code TOTP
│   ├── layout.tsx   ← Mise en page du back-office
│   └── page.tsx   ← Tableau de bord de l'équipe
├── composants/
│   ├── ConfirmationDouble.tsx   ← Validation à deux personnes
│   ├── DecisionKyc.tsx   ← Formulaire de décision KYC
│   ├── FileDeRevue.tsx   ← File de revue générique (tri, priorité, prise en charge)
│   ├── GraphiquesSecurite.tsx   ← Graphiques de sécurité
│   ├── JournalAudit.tsx   ← Lecture du journal d'audit
│   ├── PanneauAgentIa.tsx   ← Réglage d'un agent IA
│   └── VisionneuseDocument.tsx   ← Visionneuse de document sensible
├── lib/
│   └── api.ts   ← Appels à l'API Render (avec le jeton de l'utilisateur)
└── proxy.ts   ← PROXY (Next.js 16) · back-office
```

### 1.4 Commun (partagé par les 3 applications)
```
├── config/
│   ├── eslint.config.js
│   └── tsconfig.base.json
├── i18n/
│   └── src/
│       ├── erreurs.fr.ts   ← Traduction des codes d'erreur renvoyés par la base (raise exception) et par l'AP
│       └── index.ts
├── supabase/
│   └── src/
│       ├── index.ts
│       ├── navigateur.ts   ← CLIENT SUPABASE
│       ├── proxy.ts   ← SESSION DANS LE PROXY NEXT.JS (src/proxy.ts de chaque application)
│       └── serveur.ts   ← CLIENT SUPABASE
├── types/
│   └── src/
│       ├── database.types.ts   ← FICHIER GÉNÉRÉ
│       └── index.ts
├── ui/
│   └── src/
│       ├── Accordeon.tsx   ← Accordéon (FAQ)
│       ├── Badge.tsx   ← Badge de réassurance (Vérifié, Super hôte, Garantie…)
│       ├── BarreProgression.tsx   ← Barre de progression d'étapes
│       ├── Bouton.tsx   ← Bouton
│       ├── Champ.tsx   ← Champ de saisie avec libellé et erreur
│       ├── ChampTelephone.tsx   ← Champ téléphone ivoirien (+225)
│       ├── CurseurDouble.tsx   ← Curseur à deux poignées (prix min – max)
│       ├── EtatVide.tsx   ← État vide / zéro résultat
│       ├── Modale.tsx   ← Fenêtre modale
│       ├── Onglets.tsx   ← Onglets
│       ├── Prix.tsx   ← Affichage d'un prix en FCFA
│       ├── Puce.tsx   ← Puce / pilule de filtre (chips)
│       ├── Squelette.tsx   ← Squelette de chargement
│       ├── Toast.tsx   ← Message temporaire (succès, erreur)
│       ├── index.ts   ← Point d'entrée du design system
│       └── jetons.css   ← JETONS DE DESIGN
├── validation/
│   └── src/
│       └── index.ts   ← VALIDATION PARTAGÉE
└── README.md   ← 1-FRONTEND/commun — paquets partagés
```

---

## 2-BACKEND — Render (API) + Supabase (base)

### 2.1 API — noyau, démarrage et tâches de fond
```
├── noyau/
│   ├── auth/
│   │   ├── decorateurs.ts   ← DÉCORATEURS D'ACCÈS
│   │   ├── jeton.guard.ts   ← GARDE 1
│   │   └── roles.guard.ts   ← GARDE 2
│   ├── base/
│   │   └── supabase.service.ts   ← ACCÈS À LA BASE SUPABASE
│   ├── config/
│   │   └── env.ts   ← CONFIGURATION
│   ├── erreurs/
│   │   └── filtre-erreurs.ts   ← FILTRE D'ERREURS
│   ├── journalisation/
│   │   └── journal.ts   ← JOURNAUX DE L'API
│   ├── sante/
│   │   └── sante.controller.ts   ← SANTÉ
│   └── noyau.module.ts   ← NOYAU
├── taches/
│   ├── orchestrateur.service.ts   ← ORCHESTRATEUR DES TÂCHES DE FOND (ordre = priorité)
│   ├── taches.controller.ts   ← TÂCHES INTERNES
│   └── taches.module.ts
├── app.module.ts   ← MODULE RACINE
└── main.ts   ← DÉMARRAGE DE L'API (Render)
```

### 2.2 API — Client (`/client/...`)
```
├── README.md   ← Module CLIENT — /client/...
├── client.module.ts   ← MODULE CLIENT
├── contrats.controller.ts   ← Client · Contrat de location
├── documents.controller.ts   ← Client · Coffre-fort de documents
├── factures.controller.ts   ← Client · Factures certifiées
├── kyc.controller.ts   ← Client · Vérification d'identité
├── mes-donnees.controller.ts   ← Client · Mes données (loi 2013-450)
└── paiements.controller.ts   ← CLIENT · PAIEMENTS
```

### 2.3 API — Vendeur (`/vendeur/...`)
```
├── README.md   ← Module VENDEUR — /vendeur/...
├── equipe.controller.ts   ← Vendeur · Invitations d'équipe
├── etats-des-lieux.controller.ts   ← Vendeur · Photos d'état des lieux
├── exports.controller.ts   ← Vendeur · Exports comptables
├── photos.controller.ts   ← Vendeur · Photos d'annonce
├── vendeur.module.ts   ← MODULE VENDEUR
└── versements.controller.ts   ← Vendeur · Comptes de versement
```

### 2.4 API — Administrateur (`/administrateur/...`)
```
├── README.md   ← Module ADMINISTRATEUR — /administrateur/...
├── administrateur.module.ts   ← MODULE ADMINISTRATEUR
├── agents-ia.controller.ts   ← Administrateur · Agents IA
├── documents.controller.ts   ← Administrateur · Consultation des documents sensibles
├── incidents.controller.ts   ← Administrateur · Violations de données
├── mes-donnees.controller.ts   ← Administrateur · Demandes « vie privée »
├── remboursements.controller.ts   ← Administrateur · Remboursements
└── versements.controller.ts   ← Administrateur · Versements aux partenaires
```

### 2.5 API — Commun (Jeko, FNE, KYC, notifications, PDF, images, chiffrement, IA)
```
├── chiffrement/
│   └── chiffrement.service.ts   ← CHIFFREMENT APPLICATIF
├── contrats-pdf/
│   └── generateur-contrat.service.ts   ← Génération du contrat de location (PDF)
├── factures-fne/
│   ├── certification-fne.service.ts   ← CERTIFICATION DES FACTURES (FNE
│   └── fne.client.ts   ← CLIENT DE LA PLATEFORME FNE (DGI Côte d'Ivoire)
├── ia/
│   └── agents-ia.service.ts   ← PONT ENTRE L'API ET LES AGENTS IA (code dans 3-SECURITE/05-agents-ia)
├── images/
│   └── traitement-images.service.ts   ← Traitement des images
├── kyc/
│   ├── fournisseur-kyc.service.ts   ← Fournisseur de vérification d'identité
│   └── kyc-webhook.controller.ts   ← Webhook du fournisseur KYC
├── notifications/
│   ├── canaux/
│   │   ├── email.ts   ← Canal email
│   │   ├── push.ts   ← Canal push
│   │   ├── sms.ts   ← Canal sms
│   │   └── whatsapp.ts   ← Canal whatsapp
│   └── envoi-notifications.service.ts   ← ENVOI DES NOTIFICATIONS (e-mail, SMS, WhatsApp, push)
├── paiements-jeko/
│   ├── README.md   ← Paiements Jeko
│   ├── application-paiement.service.ts   ← APPLIQUER LE RÉSULTAT D'UNE TRANSACTION JEKO DANS LA BASE
│   ├── jeko-webhook.controller.ts   ← WEBHOOK JEKO
│   ├── jeko.client.ts   ← CLIENT JEKO
│   ├── paiements-jeko.module.ts
│   └── reconciliation.service.ts   ← RÉCONCILIATION DES PAIEMENTS
├── README.md   ← Module COMMUN — intégrations partagées
└── commun.module.ts   ← MODULE COMMUN
```

### 2.6 Base de données Supabase
```
├── docs/
│   ├── BASE_DE_DONNEES.md   ← Base de données — Plateforme de location et vente de véhicules
│   └── GUIDE_INSTALLATION.md   ← Guide d'installation — aide-mémoire
├── scripts/
│   └── test-db.sh   ← Teste toutes les migrations sur un PostgreSQL local vierge (hors Supabase).
├── supabase/
│   ├── migrations/
│   │   ├── 20261105000100_extensions_types.sql   ← 0100 — Extensions, schéma privé, domaines, énumérations, utilitaires
│   │   ├── 20261105000200_referentiels.sql   ← 0200 — Référentiels : géographie, catégories, marques/modèles, équipements,
│   │   ├── 20261105000300_utilisateurs.sql   ← 0300 — Comptes utilisateurs : profils, rôles, préférences, consentements,
│   │   ├── 20261105000400_partenaires.sql   ← 0400 — Espace partenaire : loueurs pro, particuliers, vendeurs, concessionnaires
│   │   ├── 20261105000500_vehicules_annonces.sql   ← 0500 — Véhicules, flotte, médias, documents, annonces (location / vente),
│   │   ├── 20261105000600_vente.sql   ← 0600 — Parcours VENTE : essais (test drive), acompte de réservation,
│   │   ├── 20261105000700_reservations_paiements.sql   ← 0700 — Tunnel de réservation (location), disponibilités, état des lieux,
│   │   ├── 20261105000800_messagerie_avis_notifications.sql   ← 0800 — Messagerie contextuelle (une boîte, des fils centrés sur l'objet),
│   │   ├── 20261105000900_confiance_securite_ia.sql   ← 0900 — Confiance & sécurité : signalements, modération, signaux de fraude,
│   │   ├── 20261105001000_support_contenu.sql   ← 1000 — Support (urgent / standard, formulaire dynamique, chatbot, WhatsApp)
│   │   ├── 20261105001100_fonctions_reservation_paiement.sql   ← 1100 — Logique métier LOCATION : devis transparent, réservation atomique,
│   │   ├── 20261105001200_fonctions_catalogue_partenaires.sql   ← 1200 — Logique métier : devenir partenaire, cycle de vie des annonces,
│   │   ├── 20261105001300_fonctions_messagerie_vente_moderation.sql   ← 1300 — Messagerie, parcours vente (essai, acompte), avis, vérification
│   │   ├── 20261105001350_helpers_equipe.sql   ← 1350 — Helpers d'accès véhicules / annonces et gestion de l'équipe partenaire
│   │   ├── 20261105001400_securite_rls.sql   ← 1400 — SÉCURITÉ : Row Level Security sur toutes les tables, droits par colonne,
│   │   ├── 20261105001500_stockage_realtime.sql   ← 1500 — Supabase Storage (buckets + policies) et Realtime
│   │   ├── 20261105001600_back_office_admin.sql   ← 1600 — Back-office : l'équipe interne peut gérer référentiels et contenus
│   │   ├── 20261106000100_paiement_jeko.sql   ← 20261106-0100 — PAIEMENT : Jeko comme prestataire unique
│   │   ├── 20261106000200_mfa_equipe.sql   ← 20261106-0200 — SÉCURITÉ : double authentification obligatoire pour l'équipe
│   │   ├── 20261106000300_factures_fne.sql   ← 20261106-0300 — FACTURATION : facture normalisée électronique (FNE) de la DGI
│   │   ├── 20261106000400_types_agents_securite.sql   ← 20261106-0400 — TYPES pour les agents IA de sécurité
│   │   └── 20261106000500_agents_ia_securite.sql   ← 20261106-0500 — SÉCURITÉ : agents IA pilotables, journal de sécurité,
│   └── optional/
│       ├── cron.sql   ← TÂCHES PLANIFIÉES (optionnel) — à exécuter UNE FOIS dans l'éditeur SQL Supabase
│       └── cron_render.sql   ← RÉVEIL DU BACKEND RENDER (optionnel) — à exécuter UNE FOIS dans l'éditeur SQL
├── tests/
│   ├── 01_parcours_complets.sql   ← Tests de bout en bout : sécurité (RLS, droits), parcours location, paiement,
│   ├── 02_back_office_seed.sql   ← Back-office (écritures admin sous RLS) et seed relançable sans écraser
│   ├── 03_securite_jeko_ia.sql   ← Tests des ajouts du 6 novembre 2026 (s'exécute après 01 et 02, même base) :
│   └── supabase_stub.sql   ← STUB LOCAL — imite le strict minimum de Supabase pour tester les migrations
├── README.md   ← Plateforme de location et vente de véhicules — Base de données
└── package.json
```

---

## 3-SECURITE
```
├── 01-modele-de-menaces/
│   └── MODELE_DE_MENACES.md   ← Modèle de menaces
├── 02-authentification-et-acces/
│   └── README.md   ← 02 — Authentification et contrôle d'accès
├── 03-protection-des-donnees/
│   ├── README.md   ← 03 — Protection des données personnelles
│   └── REGISTRE_DES_TRAITEMENTS.md   ← Registre des traitements (modèle à compléter)
├── 04-securite-applicative/
│   ├── src/
│   │   ├── entetes.ts   ← EN-TÊTES DE SÉCURITÉ HTTP
│   │   ├── fichiers.ts   ← CONTRÔLE DES FICHIERS ENVOYÉS (photos de véhicules, permis, pièces d'identité)
│   │   ├── index.ts
│   │   ├── limites.ts   ← LIMITES DE REQUÊTES (anti-abus, anti-robots, anti-force brute)
│   │   ├── webhooks.test.ts
│   │   └── webhooks.ts   ← VÉRIFICATION DES WEBHOOKS SIGNÉS (Jeko, fournisseur KYC…)
│   └── README.md   ← 04 — Sécurité applicative (code partagé)
├── 05-agents-ia/
│   ├── evaluations/
│   │   ├── README.md   ← Évaluations des agents
│   │   └── messages.jsonl
│   ├── prompts/
│   │   ├── filtrage-messages.v1.md   ← Agent : filtrage de la messagerie — version v1
│   │   ├── moderation-annonces.v1.md   ← Agent : modération des annonces — version v1
│   │   ├── moderation-avis.v1.md   ← Agent : modération des avis — version v1
│   │   ├── moderation-photos.v1.md   ← Agent : modération des photos — version v1
│   │   └── synthese-securite.v1.md   ← Agent : synthèse sécurité quotidienne — version v1
│   ├── src/
│   │   ├── agents/
│   │   │   ├── contenus.ts   ← AGENTS « CONTENUS »
│   │   │   ├── index.ts   ← Registre des agents : un agent par type de tâche `ai_jobs.job_type`.
│   │   │   └── securite.ts   ← AGENTS « SÉCURITÉ »
│   │   ├── agents.test.ts
│   │   ├── evaluer.ts   ← Rejoue evaluations/messages.jsonl avec le pré-filtre (et le modèle si LLM_API_KE
│   │   ├── executer.ts   ← EXÉCUTION D'UN AGENT SUR UNE TÂCHE
│   │   ├── fournisseur-llm.ts   ← FOURNISSEUR DE MODÈLE IA (interchangeable)
│   │   ├── garde-fous.ts   ← GARDE-FOUS DES AGENTS IA
│   │   ├── index.ts
│   │   ├── pre-filtre.ts   ← PRÉ-FILTRE PAR RÈGLES (instantané, gratuit, explicable)
│   │   ├── synthese.ts   ← AGENT « SYNTHÈSE SÉCURITÉ »
│   │   ├── types.ts   ← Types partagés par tous les agents IA.
│   │   └── worker.ts   ← WORKER DES AGENTS IA
│   └── README.md   ← 05 — Agents IA de sécurité
├── 06-surveillance-et-alertes/
│   └── README.md   ← 06 — Surveillance et alertes
├── 07-reponse-aux-incidents/
│   └── PLAN_DE_REPONSE.md   ← Plan de réponse aux incidents
├── 08-tests-de-securite/
│   └── README.md   ← 08 — Tests de sécurité
├── 09-checklists/
│   ├── AVANT_LANCEMENT.md   ← Checklist — avant le lancement public
│   ├── NOUVELLE_FONCTIONNALITE.md   ← Checklist — chaque nouvelle fonctionnalité
│   └── REVUE_MENSUELLE.md   ← Checklist — revue mensuelle de sécurité (1 h)
└── README.md   ← 3-SECURITE — la sécurité de la plateforme
```

