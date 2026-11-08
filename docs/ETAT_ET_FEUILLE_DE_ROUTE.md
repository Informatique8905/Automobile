# État du projet et feuille de route — document de passation

*Mis à jour le 8 novembre 2026, à la fin de la partie 1.*

Ce document permet à n'importe quel développeur ou agent IA de reprendre le projet sans rien perdre. Il dit :
- ce qu'est le projet et l'esprit à respecter ;
- la charte visuelle à appliquer ;
- ce qui est déjà fait ;
- ce qui reste à faire, partie par partie et fonctionnalité par fonctionnalité ;
- quand et comment déployer.

**Règle de mise à jour** : à la fin de chaque partie, l'agent qui a travaillé met à jour la section 4 (« Ce qui est fait »), coche les cases de la section 5 et note les décisions prises en section 6.


---

## 0. Pour l'IA qui reprend le projet

1. Lis d'abord `docs/PROMPT_DEVELOPPEMENT.md` en entier. Il contient les règles de travail, l'architecture imposée et la liste des choses interdites. Il fait autorité.
2. Lis ensuite ce document, puis les fichiers listés dans la section 1 du prompt.
3. Lance `git status`, `git branch --show-current` et `git log --oneline -15` pour voir où en est le dépôt.
4. Repère dans la section 5 la première partie qui n'est pas cochée. Présente ton plan au porteur du projet avant de coder.
5. Travaille sur une branche par partie, ne pousse jamais sur `main` directement, et montre les résultats de `pnpm build`, `pnpm lint`, `pnpm typecheck` et `pnpm test` à la fin de chaque partie.


---

## 1. L'esprit du projet

**La promesse.** Louer ou acheter un véhicule à Abidjan, en confiance, depuis son téléphone, en quelques minutes.

**Les trois valeurs qui guident chaque écran.**
- **La confiance** : partenaires vérifiés, prix transparents (le total est toujours visible avant de payer), paiement sécurisé, aucune fausse promesse. Un badge n'est affiché que s'il est vrai.
- **La simplicité** : une action principale par écran, le moins de saisie possible, des étapes visibles, aucun jargon.
- **Le plaisir** : une interface vivante, fluide et soignée, au niveau des meilleurs sites internationaux, qui donne envie de revenir.

**Pour qui.**
- Les clients : particuliers, expatriés, entreprises, diaspora en visite ; surtout sur téléphone Android, parfois avec une connexion lente.
- Les partenaires : agences de location, particuliers loueurs, concessionnaires et particuliers vendeurs. Ils doivent pouvoir tout gérer depuis leur téléphone, entre deux clients.
- L'équipe interne : modération, vérification, support et finance, sur ordinateur, avec double authentification.

**Le ton des textes.**
- Vouvoiement, phrases courtes, français clair et chaleureux, sans anglicismes inutiles.
- Les montants s'écrivent « 35 000 FCFA » (espace insécable), les dates « sam. 14 nov. », les heures « 14 h 30 ».
- Un message d'erreur dit ce qui se passe et quoi faire, sans jamais accuser l'utilisateur. Par exemple : « Ce véhicule n'est pas disponible à ces dates. Essayez le week-end suivant ou un modèle similaire. »
- Les boutons disent l'action : « Réserver maintenant », « Voir les 12 photos », « Contacter le vendeur ». Jamais « OK » ni « Valider » seuls.


---

## 2. Charte visuelle et expérience

### 2.1 Couleurs : 65 % blanc, 35 % orange vif

Le blanc domine : fonds, cartes, espaces de respiration. L'orange porte l'énergie de la marque et guide l'action. Les valeurs exactes vivent dans `1-FRONTEND/commun/ui/src/jetons.css`, qui fait foi. Aucune couleur n'est écrite en dur dans un composant.

- **Blanc `#FFFFFF`** : fond principal.
- **Gris très clair `#F9FAFB`** : sections alternées, fonds de champs.
- **Bordures** : gris clair discret.
- **Texte principal `#111827`** ; texte secondaire en gris foncé (contraste d'au moins 4,5:1 sur blanc).
- **Orange vif `#FF6B00`** : boutons principaux (texte `#111827` dessus, contraste 6,2:1), onglet ou élément actif, bandeaux, barres de progression, badges de marque, accents graphiques du carrousel d'accueil.
- **Orange foncé `#C2410C`** : texte orange sur fond blanc (liens, prix barrés en promotion, mentions), boutons à texte blanc, et **anneau de focus**. L'orange vif ne contraste pas assez avec le blanc pour un contour de focus (2,9:1, le minimum est 3:1).
- **États** : succès en vert, alerte en ambre, erreur en rouge, dans des tons foncés et lisibles (valeurs dans `jetons.css`).
- **Mode sombre** : pas sur le site client au lancement, pour garder une marque cohérente. Optionnel dans les tableaux de bord vendeur et administrateur, comme dans le modèle de la directive 04.

**Où va l'orange (les 35 %)** : ce qui fait agir (bouton principal), ce qui indique où l'on est (onglet, menu actif, étape du tunnel), ce qui met en valeur (véhicules à la une, offres), ce qui rassure (badge Vérifié). Jamais de grands aplats orange derrière du texte courant.

### 2.2 Typographie
- Une seule famille, chargée localement avec `next/font` (aucune requête vers un service externe), en deux graisses : normal et semi-gras. Proposition : Inter ou Plus Jakarta Sans, à valider par le porteur du projet ; à défaut, la police système actuelle.
- Texte courant : 16 px minimum sur mobile. Titres en semi-gras avec un interlettrage légèrement resserré, à la manière du modèle de connexion.
- Les prix sont toujours en semi-gras, en couleur de texte principal.

### 2.3 Formes, espaces, ombres
- Grille de 4 et 8 px ; marges généreuses ; rayon de 12 px pour les cartes et champs, de 8 px pour les petits éléments.
- Ombres très douces et rares, uniquement pour ce qui « flotte » : menus, fenêtres, bouton carte/liste.
- Cibles tactiles de 44 px minimum.

### 2.4 Photos, icônes, illustrations
- **Uniquement de vraies photos**, celles que publient les partenaires.
  - Format 4:3 dans les cartes, plein écran dans la galerie.
  - Les partenaires sont guidés à l'envoi : angles imposés (avant, arrière, côtés, trois-quarts, intérieur, tableau de bord), lumière du jour, sans filigrane.
- **Aucune illustration, mascotte, image ni icône créée par IA**, aucun pictogramme décoratif.
- Pictogrammes tolérés : fonctionnels uniquement (fermer, menu, flèches, afficher le mot de passe, chargement), en trait fin et cohérents.
- Logos Google et Apple : les logos officiels.
- Le logo du projet (`commun/ui/src/assets/logo.png`) n'est jamais redessiné ni déformé.
- Quand une photo manque : un bloc neutre en gris très clair avec le texte « Photo à venir », jamais une image de banque d'images.

### 2.5 Mouvement
- Les animations expliquent ce qui se passe : un onglet qui glisse, une carte qui s'ouvre, une étape qui avance. Jamais d'animation gratuite.
- Durées de 150 à 300 ms pour les micro-interactions, courbe douce (`cubic-bezier(0.23, 1, 0.32, 1)`, celle du modèle de connexion).
- Seul le carrousel d'accueil, piloté par le défilement avec GSAP, peut être plus long.
- Bibliothèques : `motion` pour les interfaces, `gsap` uniquement pour l'accueil.
- Respect absolu du réglage « réduire les animations » : on passe alors à de simples fondus.

### 2.6 Les modèles visuels (directives 01 à 04)
- Connexion et inscription ← `docs/references-ui/01-connexion-inscription/app-sign-in.tsx`.
- Accueil, véhicules à la une qui défilent ← `docs/references-ui/02-page-accueil/dish-orbit-carousel.tsx`.
- Fiche véhicule, toutes les photos + description ← `docs/references-ui/03-fiche-vehicule/product-rail-gallery.tsx`.
- Tableaux de bord vendeur, administrateur et client ← `docs/references-ui/04-tableaux-de-bord/dashboard-with-collapsible-sidebar.tsx`.

On en garde l'expérience, on en remplace le contenu, et on n'utilise jamais leurs données ni leurs images de démonstration.

### 2.7 Accessibilité et performance (critères de fin pour chaque écran)
- WCAG 2.2 niveau AA : contrastes, navigation au clavier, focus visible, libellés de champs toujours visibles, messages d'erreur reliés aux champs, lecteur d'écran.
- Mobile 4G : affichage principal en moins de 2,5 s, réaction au toucher en moins de 200 ms, stabilité visuelle sous 0,1. Visé : 90 en performance et 100 en accessibilité sur Lighthouse mobile.
- Images en WebP ou AVIF en trois tailles, préparées par l'API ; chargement différé sous la ligne de flottaison.
- `force-dynamic` réservé aux pages privées. Les pages publiques (accueil, catalogue, fiches, pages par ville) restent statiques ou revalidées toutes les 5 minutes.


---

## 3. Rappel des règles techniques (détail dans le prompt)

- La base Supabase décide : prix, disponibilités, droits, plafonds. Le navigateur n'envoie jamais de montant.
- Le frontend n'a que la clé publique. Les secrets vivent uniquement dans l'API (Render).
- Chaque page serveur protégée revérifie l'utilisateur avec `getUser()`. Le back-office vérifie en plus le rôle d'équipe et la session `aal2`.
- Toute évolution de la base passe par une nouvelle migration avec RLS et un test SQL. On ne modifie jamais une ancienne migration.
- Paiement : Jeko uniquement, en mode simulation tant que l'API Jeko n'est pas branchée.
- Vraies données uniquement : aucune donnée de démonstration.


---

## 4. Ce qui est fait (au 8 novembre 2026)

### Fondations
- [x] Monorepo pnpm + Turborepo : trois applications Next.js 16.4.5 (client, vendeur, administrateur), API NestJS, paquets communs (`ui`, `supabase`, `types`, `validation`, `i18n`, `config`), paquets de sécurité (`securite-applicative`, `agents-ia`).
- [x] Documentation : `README.md`, `ARCHITECTURE.md`, `STRUCTURE.md`, `AJOUTS_CAHIER_DES_CHARGES.md`, `DEPLOIEMENT.md`, `docs/` (cahier des charges, directives 00 à 04, modèles visuels, prompt).
- [x] Intégration continue GitHub : qualité (build, lint, typecheck), tests unitaires, tests de la base.
- [x] `pnpm build`, `pnpm lint`, `pnpm typecheck` et `pnpm test` au vert. Tests de sécurité : 9/9 ; tests des agents IA : 9/9.

### Base de données
- [x] 22 migrations de référence appliquées en ligne (projet Supabase `yjoqtocjvojbqkkxaqry`) : 86 tables, dont `ai_agents`.
- [x] Migration `20261108000100` ajoutée par l'agent : consentements enregistrés à l'inscription par le trigger `handle_new_user`.
  - **À vérifier** : qu'elle a un scénario de test SQL et qu'elle est appliquée en ligne (`supabase migration list`).
- [x] Logique métier en base : devis, réservation sans double réservation, paiement avec contrôle du montant, annulation, cautions, KYC, partenaires, annonces, messagerie, avis, vente, modération, IA, double authentification de l'équipe, factures FNE, journal d'audit inviolable, délai de 72 h sur les comptes de versement.

### API (écrite, pas encore testée face aux vrais services)
- [x] Configuration vérifiée au démarrage, jeton Supabase vérifié (JWKS), rôles et double authentification, filtre d'erreurs, journaux sans données personnelles, santé.
- [x] Paiement : client Jeko (chemins à adapter), webhook signé et idempotent, réconciliation, route `POST /client/paiements/initier`.
- [x] Orchestrateur des tâches de fond, file de certification FNE, pont vers les agents IA, chiffrement des comptes de versement.
- [ ] Les autres contrôleurs sont des squelettes (KYC, documents, contrats, factures, photos, états des lieux, versements, équipe, exports, remboursements, administration).

### Partie 0 — Connexion de la base : terminée
### Partie 1 — Socle : terminée (branche `partie-1-socle`)
- [x] Jetons de la charte (blanc et orange, contrastes vérifiés), logo, fonction `cn()`, Tailwind v4, shadcn en monorepo, `motion`, `gsap`, `lucide-react`.
- [x] Connexion et inscription client et vendeur, inspirées de la directive 01 :
  - e-mail + mot de passe, code à 6 chiffres par e-mail, jauge de mot de passe ;
  - téléphone (+225) et adresse (commune, quartier) à l'inscription ;
  - cases CGU (obligatoire) et marketing (facultative) ;
  - boutons Google et Apple masqués par `NEXT_PUBLIC_SSO_ACTIVE`.
- [x] Connexion administrateur sans Google ni Apple ; activation du code TOTP (`/activer-2fa` : QR code, nettoyage des facteurs non vérifiés) ; saisie du code ; accès réservé aux sessions `aal2`.
- [x] `src/proxy.ts` (Next.js 16) dans les trois applications.
- [x] `getUser()` dans les 74 pages protégées.
- [x] `/devenir-partenaire` réservé aux comptes connectés.

### Restes de la partie 1 (à traiter au fil de l'eau)
- [ ] **Back-office** : dans la mise en page serveur de l'administrateur, vérifier en plus de `getUser()` le rôle d'équipe et la session `aal2` (`staff_mfa_status()`). Un simple client connecté ne doit voir aucun écran d'administration.
- [ ] **Adresse factice dans `clientNavigateur()`** : réservée au build ; en fonctionnement, l'application doit signaler clairement une variable manquante.
- [ ] **Scripts sur Node 22** (et Node 22 LTS installé sur le poste de développement).
- [ ] **Panneau de marque** : confirmer qu'il n'affiche que le logo, une vraie photo ou les vrais chiffres de `get_platform_stats`.
- [ ] **Plus tard (partie 12)** : vérification du téléphone par SMS, activation de Google et Apple, envoi d'e-mails par un service SMTP. Le service intégré de Supabase n'envoie qu'aux membres de l'équipe, 2 e-mails par heure.


---

## 5. Ce qui reste à faire, partie par partie

Chaque fonctionnalité précise l'écran, ce qu'elle doit faire, les données utilisées et ce qui compte pour l'expérience. Une partie est finie quand toutes ses cases sont cochées et que les critères de la section 7 du prompt sont remplis.

### Partie 2 — Espace vendeur (`pro.`)
*Pourquoi maintenant : sans partenaires ni annonces, le site public n'aurait aucune vraie donnée à montrer.*

- [ ] **Mise en page des tableaux de bord (directive 04)**
  - Barre latérale repliable, sélecteur d'agence (un utilisateur peut appartenir à plusieurs partenaires), menu selon le rôle (owner, manager, agent).
  - Sur mobile : menu en tiroir et barre d'actions en bas.
  - Navigation lisible par le texte.
- [ ] **Devenir partenaire (5 étapes avec barre de progression)**
  1. Type : agence, particulier loueur, concessionnaire, particulier vendeur.
  2. Identité légale : raison sociale, RCCM et NCC, obligatoires pour les professionnels (erreur `RCCM_REQUIRED`).
  3. Documents : RCCM, pièce du gérant, attestation d'assurance, dans le bucket privé `partner_documents`.
  4. Compte de versement : envoyé à l'API `POST /vendeur/versements/comptes`, chiffré, utilisable après 72 h, avec un message clair.
  5. Suivi de validation : en attente, validé ou refusé avec motif.
  - Données : `become_partner`, `partner_private`, `partner_documents`, `partner_payout_accounts`.
- [ ] **Tableau de bord business**
  - Indicateurs : revenus, taux d'occupation, réservations, note, taux de réponse (`get_partner_kpis`), avec des filtres de période et de catégorie.
  - Courbe des revenus (`get_partner_revenue_series`).
  - Liste de tâches automatique (`get_partner_todos`) : demandes à accepter, remises du jour, documents qui expirent, avis à répondre.
  - Les chiffres s'animent doucement au chargement. Quand il n'y a encore rien : un état vide qui guide vers « Ajoutez votre premier véhicule ».
- [ ] **Flotte**
  - Liste avec statut en temps réel : disponible, loué, en maintenance, hors service (`vehicles.fleet_status`).
  - Ajout d'un véhicule : marque puis modèle en cascade (`MODEL_MAKE_MISMATCH`), année, finition, carburant, boîte, places, kilométrage, agence de rattachement.
  - Plaque et numéro de série dans `vehicle_private`, jamais publics.
  - Fiche du véhicule : documents (assurance, visite technique, carte grise) avec dates d'expiration et alertes (`vehicle_documents`), carnet d'entretien (`vehicle_maintenance_logs`), équipements (`vehicle_equipment`).
- [ ] **Annonces et éditeur fluide**
  - Liste par statut : brouillon, en revue, publiée, en pause, vendue.
  - Éditeur, location (`rental_terms`) : prix par jour, remises semaine et mois, caution et mode de caution, kilométrage inclus, âge et ancienneté de permis minimum, livraison, chauffeur.
  - Éditeur, vente (`sale_terms`) : prix, négociable, garantie (seulement avec contrat), historique.
  - Photos par glisser-déposer : angles guidés, compression dans le navigateur, envoi à `POST /vendeur/photos` (conversion, empreinte anti-copie), au moins 4 photos (`NOT_ENOUGH_PHOTOS`), réordonnancement, photo de couverture.
  - Description ; options payantes (`listing_extras`) ; tarifs saisonniers (`seasonal_prices`).
  - Soumission à la revue (`submit_listing_for_review`), pause et reprise (`set_listing_status`), statistiques (`listing_stats_daily`).
  - Expérience : enregistrement automatique du brouillon, aperçu « comme le client le verra », progression du remplissage.
- [ ] **Calendrier** : vue par véhicule, blocages manuels pour entretien ou usage personnel (`availability_blocks`), réservations visibles.
- [ ] **Réservations reçues** : à accepter dans les 24 h (`respond_to_booking`), confirmées, en cours, terminées ; fiche détaillée avec statut KYC du conducteur (jamais l'image du document).
- [ ] **Équipe** : inviter par e-mail (`invite_partner_member`, envoi par l'API), acceptation (`accept_partner_invitation`), rôles. Un agent ne modifie ni les prix ni les versements.
- [ ] **Profil public et agences** : logo, couverture, description, points de retrait avec horaires et position (`partners`, `partner_locations`).
- [ ] **Versements et factures** : comptes (4 derniers chiffres, « utilisable à partir du… »), historique (`payouts`, `payout_items`), relevés.
- [ ] **Sécurité du compte partenaire** : double authentification fortement conseillée au propriétaire, sessions, historique des connexions.

### Partie 3 — Back-office administrateur (`admin.`)
- [ ] **Garde serveur** : rôle d'équipe + `aal2` dans la mise en page (voir les restes de la partie 1).
- [ ] **Tableau de bord** : nombre d'éléments dans chaque file (KYC, partenaires, annonces, signalements, litiges, tickets), argent du jour, alertes de sécurité.
- [ ] **Validation des partenaires** : documents en lien signé de 5 minutes (consultation journalisée), décision avec motif (`verify_partner`).
- [ ] **Vérification d'identité** : pièce, permis, selfie, pré-contrôle IA indicatif, décision humaine (`decide_kyc`, `review_user_document`).
- [ ] **Modération**
  - Annonces (`moderate_listing`), certification des véhicules en vente (`certify_sale_listing`).
  - Photos (doublons détectés), messages et avis signalés.
  - File unifiée (`moderation_flags`, `resolve_flag`).
- [ ] **Utilisateurs** : fiche, sanctions (`user_sanctions`), liste noire hachée (`blocklist`), signaux de fraude.
- [ ] **Réservations** : recherche, historique des statuts (`booking_status_history`).
- [ ] **Argent**
  - Paiements et webhooks reçus (`payments`, `payment_events`).
  - Remboursements par l'API, validés par une seconde personne au-delà d'un seuil.
  - Cautions (`deposits`).
  - Versements par lot via l'API, refusés pendant la période de carence.
  - Factures et état de certification FNE.
- [ ] **Litiges** : pièces des deux parties, états des lieux, messages, décision et partage de la caution (`disputes`, `dispute_evidence`).
- [ ] **Support** : tickets, réponses, priorité urgent ou standard (`support_tickets`, `support_messages`).
- [ ] **Sécurité**
  - Pilotage des agents IA : mode, seuils, budget, version du prompt, journal des décisions (`ai_agents`, `ai_jobs`, `ai_agent_runs`).
  - Signaux de fraude, journal des connexions (`security_events`).
  - Registre des violations de données (`data_incidents`), demandes « vie privée » (`privacy_requests`), journal d'audit.
- [ ] **Référentiels** : villes, communes, catégories, marques, modèles, équipements, options, formules d'assurance.
- [ ] **Contenus** : FAQ, pages, documents légaux versionnés.
- [ ] **Réglages** (`platform_settings`) : TVA, frais de service, commission, délais, plafond Jeko, période de carence.
- [ ] **Équipe interne** : rôles (`user_roles`), deux administrateurs au maximum au lancement.

### Partie 4 — Site public client (`www.`)
- [ ] **Mise en page publique**
  - Barre de navigation : logo, Louer, Acheter, Vendre, espace utilisateur, connexion.
  - Pied de page : liens légaux, contact, WhatsApp.
  - Bandeau de cookies (aucune mesure d'audience avant accord, `consents`).
  - Pages 404 et 500 à la charte.
- [ ] **Accueil (directive 02)**
  - Carrousel en orbite des véhicules à la une (`search_listings`, `is_featured`) : vraie photo, marque et modèle, prix, partenaire et badge, équipements, couleur d'accent ; clic vers la fiche.
  - Moteur de recherche à onglets Location (lieu et dates) et Achat (budget, marque).
  - Catégories visuelles en photos réelles ; offres du moment (`offer_discount_pct`) ; bloc de réassurance rédigé en texte.
  - S'il n'y a encore aucun véhicule à la une : le carrousel se masque, la recherche reste, avec un appel aux partenaires.
  - Page revalidée toutes les 5 minutes.
- [ ] **Catalogue `/recherche`**
  - Rappel du contexte (lieu et dates, ou type d'achat) ; filtres en puces ; panneau de filtres complet.
  - Filtres : mode, budget avec curseur double, ville et rayon, marque, modèle, année, carburant, boîte, places, type de vendeur, livraison, siège bébé, animaux, avec chauffeur, garanti ou certifié.
  - Commutateur liste et carte (bouton flottant sur mobile) ; tri : pertinence, prix croissant et décroissant, kilométrage, proximité, note.
  - Pagination par 24 (défilement continu sur mobile).
  - Cartes : carrousel de 4 à 5 photos, favori sans quitter la page, badges, prix par jour et estimation du total.
  - Zéro résultat : réinitialiser les filtres, véhicules similaires (`suggest_similar_listings`).
  - Comparateur de 2 à 3 véhicules.
- [ ] **Fiche véhicule (directive 03)**
  - Galerie qui pivote entre les angles réels, « Voir toutes les photos » en plein écran.
  - Titre (marque, modèle, année, finition) ; puces (carburant, boîte, kilométrage, places) ; commune de prise en charge.
  - Bloc location : dates et lieu de restitution, devis transparent (`quote_rental`), caution, HT/TTC, « Réserver maintenant ».
  - Bloc vente : prix, simulateur de crédit, « Réserver un essai » ou « Contacter le vendeur » (`start_listing_conversation`).
  - Équipements (confort, technologie, sécurité) ; conditions (annulation, carburant, kilométrage) ; rapport d'inspection ; profil du partenaire et avis ; véhicules similaires.
  - Données structurées pour Google, image de partage WhatsApp, comptage des vues (`track_listing_event`).
- [ ] **Pages référencées** : « location voiture [commune] », « voitures à vendre [ville] », plan du site, `robots.txt`.
- [ ] **Profil public d'un partenaire** et **page « Vendre »** (présentation, puis renvoi vers `pro./devenir-partenaire`).

### Partie 5 — Tunnel de réservation et paiement simulé
- [ ] **Étape a, options et assurances**
  - Récapitulatif express en haut : dates, lieux, visuel.
  - Formules : la responsabilité civile est incluse et non décochable ; formules intermédiaire et tous risques en option.
  - Options : siège enfant, GPS, conducteur supplémentaire, kilométrage supplémentaire, livraison à domicile, à l'hôtel ou à l'aéroport, chauffeur.
  - Total recalculé par la base à chaque changement.
- [ ] **Étape b, conducteur et identité**
  - Documents déjà validés : on passe.
  - Sinon : photo du permis recto verso, pièce d'identité, selfie, avec consentement biométrique.
  - Tant que le fournisseur KYC n'est pas choisi : envoi dans le bucket privé et vérification humaine (`decide_kyc`).
  - Conducteur supplémentaire : mêmes vérifications (`booking_drivers`).
  - Messages clairs pour `DRIVER_TOO_YOUNG`, `DRIVER_LICENSE_TOO_RECENT` et les autres refus.
- [ ] **Étape c, récapitulatif et paiement**
  - Détail des coûts ; mode de caution ; code promo.
  - `create_rental_booking` bloque le calendrier pendant le délai de paiement.
  - Bouton « Payer » vers `POST /client/paiements/initier`, avec le **fournisseur simulé** (`PAIEMENT_MODE=simulation`) : page de test réussi, échoué ou abandonné, et webhook signé.
  - Plafond Jeko : message `AMOUNT_ABOVE_PROVIDER_LIMIT`.
- [ ] **Retour de paiement** : « Vérification de votre paiement… » ; le statut est lu dans la base, jamais dans l'adresse de la page.
- [ ] **Étape d, confirmation**
  - Numéro de réservation et QR code (jeton à usage unique).
  - Contrat PDF généré par l'API et envoyé par e-mail.
  - Itinéraire vers le point de retrait, contacts révélés (`get_booking_contacts`), ajout au calendrier, partage WhatsApp.
- [ ] **Annulation et expiration** : politique appliquée par `cancel_booking`, expirations par `pg_cron` (`optional/cron.sql`).
- [ ] **Facture** : « en cours de certification » tant que le client FNE n'est pas branché.

### Partie 6 — Espace client
- [ ] **Tableau de bord** (version allégée de la directive 04) : rappels contextuels (`get_my_reminders`) et historique des activités.
- [ ] **Mes réservations**
  - Liste et détail : QR code, contrat, facture, état des lieux, annulation, avis.
  - Prolongation : **fonction à créer en base** (nouvelle migration, paiement `rental_extension`).
  - Signaler un incident : création d'un litige (vérifier les droits d'écriture sur `disputes`).
- [ ] **Mes achats** : essais, acomptes, demandes de financement.
- [ ] **Coffre-fort de documents** : statut (en attente, validé, refusé avec motif), dates d'expiration, remplacement.
- [ ] **Favoris** ; **alertes de recherche** (`saved_searches`, avec notification quand un véhicule correspond).
- [ ] **Paiements et factures**.
- [ ] **Notifications** et préférences par canal.
- [ ] **Sécurité du compte** : double authentification facultative, appareils, historique des connexions (`security_events`).
- [ ] **Mes données** : export, rectification, opposition (`request_privacy_action`), suppression du compte avec 30 jours de délai (`request_account_deletion`, `cancel_account_deletion`).
- [ ] **Profil** : date de naissance verrouillée après le KYC.

### Partie 7 — Remise, retour, litiges, avis
- [ ] **Remise**
  - Le vendeur scanne le QR code du client (`start_booking`, refusé si le permis n'est pas vérifié).
  - Relevé du kilométrage et du carburant.
- [ ] **États des lieux de départ et de retour**
  - Photos guidées et horodatées via l'API (`vehicle_inspections`, `inspection_photos`).
  - Dommages avec gravité (`inspection_damages`).
  - Signature des deux parties (`sign_inspection`).
  - Fonctionne avec un réseau faible : photos mises en file d'attente puis envoyées.
- [ ] **Retour** : `complete_booking`, libération de la caution (`release_due_deposits`) ou ouverture d'un litige.
- [ ] **Litiges** : pièces, échanges, décision de l'équipe, partage de la caution.
- [ ] **Avis dans les deux sens**
  - Fenêtre de dépôt (`submit_review`), réponse publique du partenaire (`respond_to_review`), notes mises à jour (`refresh_partner_stats`).
  - Critères du badge « Super hôte » à valider. Proposition : note d'au moins 4,7, au moins 10 locations, taux de réponse d'au moins 90 %, aucune annulation du partenaire sur 6 mois.

### Partie 8 — Parcours vente
- [ ] **Réserver un essai** : créneaux, permis, confirmation (`request_test_drive`, `update_test_drive_status`).
- [ ] **Contacter le vendeur** : conversation liée à l'annonce.
- [ ] **Acompte de réservation** (`create_sale_reservation`, expiration automatique).
  - Règles des arrhes à afficher.
  - Au lancement, l'acompte peut être encaissé directement par la concession : décision du porteur du projet.
- [ ] **Simulateur de crédit** : taux et durée fournis par un partenaire bancaire (à trouver), taux effectif global affiché, sous le taux d'usure.
- [ ] **Demande de financement** (`financing_requests`) ; enregistrement de la vente (`record_vehicle_sale`).
- [ ] **Badges « Certifié » et « Garantie »** seulement s'ils sont justifiés (inspection réelle, contrat de garantie).

### Partie 9 — Messagerie et notifications
- [ ] **Messagerie contextuelle**
  - Une boîte, des fils rattachés à une annonce, une réservation ou un essai ; temps réel ; pièces jointes ; lu et non lu (`mark_conversation_read`).
  - Bandeau « Ne payez jamais en dehors de la plateforme ».
  - Messages signalés par l'agent IA affichés comme tels.
- [ ] **Centre de notifications** et préférences (`notifications`, `notification_preferences`).
- [ ] **Envoi par l'API**
  - E-mails transactionnels à la charte (confirmation, rappel de remise, facture, sécurité).
  - Notifications push de la PWA (`push_subscriptions`).
  - SMS et WhatsApp Business plus tard (partie 12).
- [ ] **Modèles d'e-mails Supabase** (code, réinitialisation) en français, avec le logo.

### Partie 10 — Pages institutionnelles
- [ ] **À propos** : pourquoi la plateforme est sûre, simple et fiable ; vrais chiffres (`get_platform_stats`) ; équipe ou fondateur ; logos de partenaires avec leur accord écrit. Textes fournis par le porteur du projet.
- [ ] **FAQ** : recherche prédictive (`search_faq`), onglets Location, Vente, Paiement et sécurité, Espace partenaire, accordéon, vote « utile » (`vote_faq`). Contenus à rédiger.
- [ ] **Contact et support**
  - Urgent : numéro vert, WhatsApp.
  - Standard : formulaire dynamique avec n° de réservation et e-mail (`support_tickets`).
  - Carte des agences physiques.
- [ ] **Documents légaux** (`legal_documents`, versionnés) : CGU, conditions de location et de vente, confidentialité (loi 2013-450), cookies, mentions légales. Textes à faire valider par un avocat.

### Partie 11 — Sécurité IA, qualité, surveillance
- [ ] **Agents IA**
  - Clé du modèle et tarifs dans l'API.
  - Agents de sécurité en mode observation pendant 2 semaines, puis passage en assistance si les évaluations sont bonnes.
  - Synthèse quotidienne par e-mail.
- [ ] **Surveillance** : Sentry (erreurs), surveillance de disponibilité des 4 adresses, alertes.
- [ ] **Sauvegarde nocturne** : secrets GitHub `SUPABASE_DB_URL` et `BACKUP_PASSPHRASE`, puis une restauration testée.
- [ ] **Tests**
  - Scan OWASP ZAP de la recette ; checklist manuelle (`3-SECURITE/08-tests-de-securite`).
  - Audit d'accessibilité ; Lighthouse mobile sur les pages clés.
  - Test d'intrusion avant le lancement public.

### Partie 12 — Branchement des services réels
- [ ] **Jeko** : adapter `jeko.client.ts` à leur documentation, secret de webhook, test de chaque moyen (Wave, Orange Money, MTN MoMo, Moov Money, Djamo, carte, QR PI-SPI), puis `PAIEMENT_MODE=jeko`.
- [ ] **E-mails** : service SMTP (Brevo ou équivalent) dans Supabase et dans l'API.
- [ ] **SMS** : fournisseur relié à Supabase, puis vérification du téléphone.
- [ ] **Google et Apple** : identifiants OAuth, puis `NEXT_PUBLIC_SSO_ACTIVE=true`.
- [ ] **Fournisseur KYC** (à choisir) ; **client FNE** de la DGI ; **WhatsApp Business** ; **fournisseur de cartes** (à choisir).

### Transverse, à garder en tête dans chaque partie
- [ ] PWA : application installable ; réservation et QR code consultables sans réseau.
- [ ] Anglais (après le lancement) : tous les textes passent déjà par `@plateforme/i18n`.
- [ ] Mesure d'audience seulement après consentement.
- [ ] États de chargement, vide et erreur sur chaque écran.
- [ ] Mise à jour des en-têtes de fichiers, des README et de ce document.


---

## 6. Décisions attendues du porteur du projet

Ces choix bloquent certaines fonctionnalités : l'agent doit les demander plutôt que les inventer.

- Police de caractères (Inter, Plus Jakarta Sans ou police système).
- Montants : frais de service, commission par type de partenaire, politique d'annulation (délais et pourcentages), montant de caution par catégorie. Ils se règlent dans `platform_settings`.
- Critères du badge « Super hôte ».
- Fournisseur de cartes géographiques.
- Fournisseur de vérification d'identité.
- Partenaire bancaire pour le simulateur de crédit.
- Encaissement des acomptes de vente : par la plateforme ou par la concession.
- Textes : À propos, FAQ, documents légaux.
- Nom de domaine en `.ci`, numéro vert, numéro WhatsApp Business.


---

## 7. Déployer : quand et comment

### Déploiement n° 1 — maintenant, juste après la fusion de la partie 1
**Objectif** : mettre en ligne la petite application actuelle pour découvrir les problèmes d'hébergement tant qu'elle est simple.

1. **Vercel** : importer le dépôt trois fois (racines `1-FRONTEND/client`, `1-FRONTEND/vendeur`, `1-FRONTEND/administrateur`), offre gratuite.
   - Variables : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SSO_ACTIVE=false`.
2. **Render** : « New → Blueprint » avec `render.yaml`, offre gratuite. Saisir les secrets dans le tableau de bord, avec `PAIEMENT_MODE=simulation`.
   - L'API refuse de démarrer si une variable obligatoire manque (`noyau/config/env.ts`). Avant ce déploiement, l'agent doit rendre les variables Jeko, FNE, KYC et IA facultatives tant que leurs services ne sont pas branchés (mode simulation), tout en gardant obligatoires celles de Supabase, `CRON_SECRET` et `PAYOUT_ENCRYPTION_KEY`.
3. **Supabase** : ajouter les trois adresses `…vercel.app` dans les URL de redirection. Mettre en place la sauvegarde nocturne (secrets GitHub).
4. **Tester depuis ton téléphone** : inscription, connexion, code par e-mail, activation du code TOTP sur l'administration.

Tant qu'il n'y a ni vrai paiement ni commission, l'offre gratuite de Vercel convient.

### Ensuite, à chaque partie : le déploiement continu
1. L'agent travaille sur une branche (`partie-2-vendeur`…).
2. À chaque envoi sur GitHub, Vercel crée automatiquement une **adresse de prévisualisation**. Tu testes sur ton téléphone avant d'accepter.
3. Si la partie modifie la base : la nouvelle migration est testée par la CI, puis appliquée en ligne (`supabase db push`) **avant** la fusion du code qui l'utilise, après ta validation.
4. Tu fusionnes la branche dans `main` : Vercel et Render mettent la production à jour tout seuls.

### Les grandes étapes de mise en ligne
- **Bêta partenaires**, après les parties 2 et 3 : inviter 3 à 5 agences à créer leur compte et leurs vrais véhicules. C'est ce qui remplira l'accueil et le catalogue avec de vraies données.
- **Bêta clients**, après les parties 4 à 7 : des personnes de confiance réservent avec le paiement simulé.
- **Lancement public**, après les parties 8 à 12 et la checklist `3-SECURITE/09-checklists/AVANT_LANCEMENT.md`.
  - Passer en offres payantes : Vercel Pro, Render Starter, Supabase Pro (environ 52 $ par mois).
  - Brancher le nom de domaine, Jeko en réel, le service d'e-mails et les pages légales.

### Apporter des modifications après un déploiement
- On ne modifie jamais directement en production. Toute modification suit le même chemin : branche, prévisualisation, test, fusion.
- La base n'évolue que par une nouvelle migration. On ne modifie pas une table à la main dans le tableau de bord Supabase.
- En cas de problème :
  - Vercel : « Instant Rollback » remet la version précédente en un clic.
  - Render : « Rollback » sur le déploiement précédent.
  - Base : une migration corrective, et les sauvegardes nocturnes en dernier recours.


---

## 8. Passer la main à une autre IA

Donne-lui l'accès au dépôt et colle ce message :

```
Tu reprends le développement de ma plateforme de location et de vente de véhicules. Lis d'abord docs/PROMPT_DEVELOPPEMENT.md en entier, puis docs/ETAT_ET_FEUILLE_DE_ROUTE.md, puis les fichiers listés dans la section 1 du prompt. Lance git status, git branch --show-current et git log --oneline -15. Résume-moi ce qui est fait, ce que tu as compris de l'esprit et de la charte du projet, et propose-moi ton plan pour la première partie non cochée de la section 5. Ne code rien avant ma validation. À la fin de chaque partie, mets à jour docs/ETAT_ET_FEUILLE_DE_ROUTE.md.
```
