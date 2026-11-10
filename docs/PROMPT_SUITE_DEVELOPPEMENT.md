Tu es le développeur principal de ma plateforme de location et de vente de véhicules en Côte d'Ivoire. Tu reprends un projet déjà commencé : l'architecture est en place, la base de données est en ligne et complète, et la partie 1 (le socle et l'authentification) est terminée. Ta mission est de construire tout le reste de l'application, partie par partie, jusqu'au lancement, avec l'exigence d'un développeur senior qui livre du code de production.

Je ne construis pas une version réduite : chaque fonctionnalité de mon cahier des charges et des ajouts doit exister, fonctionner avec de vraies données, être belle, rapide et sûre. Tu as accès à mon dépôt Git. À la fin de chaque partie terminée et vérifiée, tu la mets toi-même sur le dépôt, selon la méthode décrite en section 8.

Lis ce prompt en entier avant de commencer. Il fait autorité sur tout le reste, sauf sur une directive plus récente que je déposerais dans `docs/directives/`.


# 1. Le projet et son esprit

C'est une marketplace qui réunit deux activités :
- **La location de véhicules** : agences professionnelles et particuliers, avec ou sans chauffeur.
- **La vente de véhicules** : concessionnaires et particuliers.

Elle vise d'abord Abidjan, puis la Côte d'Ivoire. Les prix sont en francs CFA, les téléphones au format ivoirien (+225), l'interface est en français, et l'anglais viendra après le lancement. La plupart des utilisateurs viennent d'un téléphone Android, parfois sur un réseau lent : tout se conçoit d'abord pour un écran de 360 pixels de large, puis s'adapte au bureau.

La promesse de la plateforme : louer ou acheter un véhicule à Abidjan, en confiance, depuis son téléphone, en quelques minutes. Trois valeurs guident chaque écran :
- **La confiance** : partenaires vérifiés, prix transparents (le total est toujours visible avant de payer), paiement sécurisé, et aucun badge ni aucune promesse qui ne soit vrai.
- **La simplicité** : une action principale par écran, le moins de saisie possible, des étapes visibles, aucun jargon.
- **Le plaisir** : une interface vivante, fluide et soignée, au niveau des meilleurs sites internationaux (Airbnb, Getaround, Turo, Apple, Stripe, Linear), qui conquiert dès la première seconde et donne envie de revenir.

Il y a trois espaces, et on les retrouve partout dans le dépôt :
- **Le client** : site public et espace client, `1-FRONTEND/client`, futur `www.`.
- **Le vendeur** : espace partenaire, `1-FRONTEND/vendeur`, futur `pro.`.
- **L'administrateur** : back-office de l'équipe, `1-FRONTEND/administrateur`, futur `admin.`.

Le backend reprend ce découpage dans `2-BACKEND/api/src/modules/` (client, vendeur, administrateur, commun). La sécurité est rangée à part dans `3-SECURITE`.

Le ton des textes de l'interface :
- **Vouvoiement**, phrases courtes, français clair et chaleureux.
- **Formats** : montants en « 35 000 FCFA » (espace insécable), dates en « sam. 14 nov. », heures en « 14 h 30 ».
- **Messages d'erreur** : ils disent ce qui se passe et quoi faire, sans jamais accuser l'utilisateur.
- **Boutons** : ils nomment l'action (« Réserver maintenant », « Voir les 12 photos », « Contacter le vendeur »), jamais « OK » ou « Valider » seuls.


# 2. Ce que tu dois lire avant de coder

Lis ces fichiers en entier, dans cet ordre :

1. `docs/ETAT_ET_FEUILLE_DE_ROUTE.md` : l'état du projet et la liste des tâches. Tu le mettras à jour à la fin de chaque partie.
2. `docs/PROMPT_DEVELOPPEMENT.md` : le prompt d'origine. Le présent prompt le complète et le remplace en cas de contradiction.
3. `docs/CAHIER_DES_CHARGES.md`, puis `AJOUTS_CAHIER_DES_CHARGES.md` : les deux font partie du périmètre au même titre.
4. `docs/directives/` : en commençant par `00-regles-communes.md`, valable pour toutes les pages. Relis ce dossier au début de chaque partie, car j'y ajouterai des directives. La plus récente l'emporte pour la partie qu'elle concerne.
5. `docs/references-ui/` : les quatre modèles visuels que j'ai choisis.
6. `README.md`, `ARCHITECTURE.md`, `STRUCTURE.md`, `DEPLOIEMENT.md`.
7. `3-SECURITE/README.md` et ses dossiers `01` à `04`, puis `09-checklists/NOUVELLE_FONCTIONNALITE.md` et `09-checklists/AVANT_LANCEMENT.md`.
8. `2-BACKEND/base-de-donnees/docs/BASE_DE_DONNEES.md` : les 86 tables, les fonctions et les règles métier déjà codées.
9. Le `README.md` de chaque application ou module, et l'en-tête de chaque fichier squelette que tu remplis. Chaque fichier squelette commence par un en-tête qui décrit son contenu, ses données, ses règles de sécurité et ce qu'il reste à faire : respecte-le, et mets-le à jour si tu changes quelque chose.

Ensuite :
- lance `git status`, `git branch --show-current` et `git log --oneline -20` ;
- résume-moi en quelques lignes ce que tu as compris (le projet, l'esprit, la charte, ce qui est fait) ;
- puis enchaîne avec la première partie de la section 10.


# 3. Ce qui a déjà été réalisé, et comment

## 3.1 Le dépôt et les outils

Le dépôt est un monorepo pnpm avec Turborepo, organisé en trois zones : `1-FRONTEND`, `2-BACKEND`, `3-SECURITE`.

Les trois applications frontend sont en Next.js 16.4.5 (App Router, TypeScript). Chacune possède :
- un fichier `src/proxy.ts` avec une fonction exportée `proxy` (le nouveau nom de `middleware.ts` depuis Next.js 16) ;
- un `next.config.ts` qui applique les en-têtes de sécurité de `@plateforme/securite-applicative` ;
- un `vercel.json`, un `.env.example` et un `eslint.config.mjs` qui ignore `.next/**`.

Les paquets communs vivent dans `1-FRONTEND/commun` :
- `ui` : design system et jetons ;
- `supabase` : clients navigateur, serveur et proxy, avec la seule clé publique ;
- `types` : types générés depuis la base ;
- `validation` : schémas zod partagés avec l'API (`telephoneCI`, `montantXOF`, `periodeLocation`, `inscription`, `filtresCatalogue`) ;
- `i18n` : traduction des codes d'erreur de la base avec `traduireErreur` ;
- `config` : TypeScript et ESLint.

Les paquets de sécurité vivent dans `3-SECURITE` :
- `04-securite-applicative` : en-têtes HTTP et CSP, vérification HMAC des webhooks, contrôle du vrai type des fichiers, limites de requêtes.
- `05-agents-ia` : dix agents de modération et de sécurité avec leurs garde-fous, plus une synthèse quotidienne. Ses types sont exportés depuis `dist/`.

L'API est en NestJS 11. Son `eslint.config.cjs` utilise typescript-eslint (règles `no-explicit-any`, `no-unused-vars`, `no-eval`) et le script `lint` est `eslint src`.

L'intégration continue est dans `.github/workflows/ci.yml`, avec trois jobs :
- `qualite` : build, lint, typecheck ;
- `tests-unitaires` : sécurité, agents IA, API ;
- `base-de-donnees` : installe le client PostgreSQL, lance `supabase start` puis `scripts/ci-test.sh` ; les tests SQL ne sont jamais sautés en CI.

Le fichier `.github/workflows/securite.yml` analyse les secrets, les dépendances et le code, et vérifie qu'aucune clé secrète n'apparaît dans `1-FRONTEND`. Le fichier `.github/workflows/sauvegarde-base.yml` fait une sauvegarde chiffrée chaque nuit ; ses secrets GitHub ne sont pas encore configurés.

À la fin de la partie 1 :
- `pnpm build`, `pnpm lint`, `pnpm typecheck` et `pnpm test` passent ;
- les tests de sécurité donnent 9/9 et ceux des agents IA 9/9 ;
- l'API n'a pas encore de test (`--passWithNoTests`) ;
- les tests SQL sont sautés en local quand `psql` est absent, mais tournent en CI.

## 3.2 La base de données

Elle vit dans `2-BACKEND/base-de-donnees` : migrations dans `supabase/migrations`, tests SQL dans `tests`, documentation dans `docs`. C'est le seul chemin valable.

La base en ligne est le projet Supabase `yjoqtocjvojbqkkxaqry`. Elle contient 86 tables, dont `ai_agents` : les 22 migrations de référence y sont appliquées.

L'agent précédent a ajouté la migration `20261108000100`, qui enregistre les consentements de l'inscription grâce au trigger `handle_new_user`. Vérifie qu'elle a un scénario de test SQL et qu'elle est appliquée en ligne.

Les règles métier sont déjà codées dans la base. Utilise ces fonctions, ne les recode pas dans le navigateur :
- **Catalogue et devis** : `search_listings`, `suggest_similar_listings`, `quote_rental`, `get_listing_busy_periods`, `track_listing_event`.
- **Réservation et paiement** : `create_rental_booking`, `create_booking_payment`, `cancel_booking`, `respond_to_booking`, `start_booking`, `complete_booking`, `sign_inspection`, `get_booking_contacts`.
- **Partenaires et annonces** : `become_partner`, `invite_partner_member`, `accept_partner_invitation`, `submit_listing_for_review`, `set_listing_status`.
- **Tableaux de bord et statistiques** : `get_partner_kpis`, `get_partner_revenue_series`, `get_partner_todos`, `get_my_reminders`, `get_platform_stats`.
- **Messagerie et avis** : `start_listing_conversation`, `mark_conversation_read`, `submit_review`, `respond_to_review`.
- **Vente** : `request_test_drive`, `update_test_drive_status`, `create_sale_reservation`, `record_vehicle_sale`.
- **Administration** : `moderate_listing`, `certify_sale_listing`, `verify_partner`, `decide_kyc`, `review_user_document`, `resolve_flag`, `staff_mfa_status`.
- **FAQ et données personnelles** : `search_faq`, `vote_faq`, `request_privacy_action`, `request_account_deletion`, `cancel_account_deletion`.
- **Réservées au serveur** : `handle_jeko_payment_success`, `handle_payment_failure`, `claim_ai_jobs`, `complete_ai_job`, `claim_invoices_for_fne`, `record_fne_result`, `find_photo_duplicates`.

Ce que la base garantit déjà :
- les rôles admin, moderator et support ne sont reconnus qu'avec une session à double authentification (`aal2`) ;
- un paiement n'est validé que si le montant et la devise reçus sont exacts ;
- un nouveau compte de versement n'est utilisable qu'après 72 heures ;
- le journal d'audit ne peut être ni modifié ni supprimé ;
- au-delà de 2 000 000 FCFA, un paiement Jeko est refusé (`AMOUNT_ABOVE_PROVIDER_LIMIT`).

## 3.3 L'API et le code de sécurité déjà écrits

Dans `2-BACKEND/api/src`, ces éléments sont du vrai code :
- la configuration vérifiée au démarrage (`noyau/config/env.ts`) ;
- la vérification du jeton Supabase par JWKS (`noyau/auth/jeton.guard.ts`) ;
- les rôles et la double authentification de l'équipe (`noyau/auth/roles.guard.ts`) ;
- le filtre d'erreurs, les journaux sans données personnelles et la route de santé ;
- le paiement : client Jeko dont les chemins restent à adapter, webhook signé et idempotent, réconciliation, route `POST /client/paiements/initier` ;
- l'orchestrateur des tâches de fond (`POST /interne/taches/executer`, déclenché par la base toutes les 5 minutes) ;
- la file de certification des factures FNE, le pont vers les agents IA et le chiffrement AES-256-GCM des comptes de versement.

Les autres contrôleurs sont des squelettes qui renvoient `NotImplementedException`.

## 3.4 La partie 1, telle qu'elle a été faite

**Le design system**
- `1-FRONTEND/commun/ui/src/jetons.css` contient la charte :
  - blanc `#FFFFFF` et `#F9FAFB` ;
  - orange vif `#FF6B00` ;
  - orange foncé `#C2410C` pour le texte orange accessible ;
  - texte principal `#111827` ;
  - états sémantiques vérifiés WCAG 2.2 AA.
- Le logo est dans `commun/ui/src/assets/logo.png`.
- La fonction `cn()` (clsx + tailwind-merge) est dans `commun/ui/src/lib/utils.ts`.
- Tailwind CSS v4 est installé dans les trois applications (`tailwindcss` et `@tailwindcss/postcss`, fichier `postcss.config.mjs`).
- Le `globals.css` de chaque application importe `tailwindcss` et `@plateforme/ui/jetons.css`, avec une directive `@source` vers `commun/ui`. Les mises en page racines importent `globals.css`.
- Chaque application a un `components.json` shadcn en mode monorepo, avec des alias vers `@plateforme/ui`.
- `motion`, `gsap`, `@gsap/react` et `lucide-react` sont installés.

**L'authentification client et vendeur**
- Pages `client/src/app/(auth)/connexion/page.tsx`, `client/src/app/(auth)/inscription/page.tsx` et `vendeur/src/app/connexion/page.tsx`, inspirées de la directive 01.
- La mise en page :
  - écran partagé avec le formulaire à gauche et un panneau de marque orange à droite ;
  - onglets à indicateur glissant ;
  - écran de succès animé.
- Les moyens de connexion :
  - e-mail + mot de passe, avec une jauge de force (quatre règles) ;
  - code à 6 chiffres reçu par e-mail.
- Les champs d'inscription :
  - prénom, nom, e-mail, mot de passe ;
  - téléphone (+225) ;
  - adresse : `city_id` et `district_id` ;
  - case CGU obligatoire et case marketing facultative.
- Les boutons Google et Apple sont masqués tant que `NEXT_PUBLIC_SSO_ACTIVE` ne vaut pas `true`. Un bandeau s'affiche quand le retour OAuth échoue (`?erreur=callback`).
- `useSearchParams` a été remplacé par `useEffect` + `URLSearchParams` pour éviter un `Suspense`.

**Le back-office**
- La connexion administrateur n'a ni Google ni Apple.
- Le proxy fonctionne ainsi :
  - pas de facteur TOTP enregistré (`nextLevel` vaut `aal1`) → redirection vers `/activer-2fa` ;
  - facteur présent mais session `aal1` → redirection vers `/connexion` pour saisir le code ;
  - un administrateur déjà en `aal2` qui ouvre `/activer-2fa` est renvoyé vers `/tableau-de-bord`.
- `/activer-2fa` :
  - supprime d'abord les facteurs TOTP non vérifiés ;
  - appelle `mfa.enroll` et affiche le QR code avec la clé et un bouton copier ;
  - vérifie ensuite le code par `mfa.challenge` puis `mfa.verify`, ce qui fait passer la session en `aal2` ;
  - gère quatre états : chargement, scanner, succès, erreur.

**La protection des pages**
- Les 74 pages protégées (21 côté client, 20 côté vendeur, 33 côté administrateur) vérifient l'utilisateur côté serveur avec ce motif :
  ```
  const supabase = await clientServeur();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/connexion');
  ```
- `/devenir-partenaire` est réservé aux comptes connectés, grâce à `vendeur/src/app/devenir-partenaire/layout.tsx` et à son retrait des routes publiques du proxy.

**Autres corrections**
- `@supabase/supabase-js` ajouté au client et au vendeur.
- `export const dynamic = 'force-dynamic'` sur les pages qui utilisent `clientNavigateur()`.
- Un repli « adresse factice » dans `clientNavigateur()` quand les variables manquent au build.
- `tsx` installé et scripts de test adaptés à Node 20.

**Les décisions déjà prises avec moi**
- Pas de version réduite : toute l'application est construite.
- Jeko est le seul prestataire de paiement, développé en mode simulation jusqu'à ce que j'aie les accès.
- Les démarches administratives (Jeko, ARTCI, FNE, assureur) sont gérées par moi.
- Le téléphone est enregistré mais pas encore vérifié par SMS.
- Google et Apple sont masqués pour l'instant.
- Le service d'e-mails intégré de Supabase ne sert qu'aux tests : il n'envoie qu'aux membres de l'équipe, deux messages par heure.


# 4. Les règles d'architecture, non négociables

**La base décide.**
- Prix, disponibilités, annulations, droits, plafonds et règles métier sont calculés et vérifiés dans Supabase, par les fonctions et les règles RLS.
- Le navigateur affiche ce que la base renvoie. Il n'envoie jamais de montant et ne calcule jamais un prix qui sera facturé.

**Le frontend n'a que la clé publique.**
- Il lit directement la base pour tout ce que la RLS protège.
- Il n'appelle l'API Render que pour ce qui exige un secret ou un service externe : paiement, vérification d'identité, traitement des photos, contrats PDF, factures, export de données, e-mails.
- La clé secrète Supabase, les clés de paiement et la clé du modèle IA ne vivent que dans l'API.

**Dans l'API, le jeton de l'utilisateur d'abord.**
- Appelle Supabase avec le jeton de l'utilisateur (`base.pourUtilisateur(jeton)`) chaque fois que c'est possible.
- Le client à clé secrète (`base.admin`) est réservé aux webhooks, aux tâches de fond et aux agents IA, avec le commentaire « Clé secrète justifiée ».

**Le proxy n'est pas une protection.**
- Chaque page serveur protégée revérifie l'utilisateur avec `getUser()`.
- Le back-office vérifie en plus, côté serveur, le rôle d'équipe et la session `aal2` avec `staff_mfa_status()`.

**La base n'évolue que par de nouvelles migrations.**
- Toute évolution passe par une nouvelle migration datée dans `2-BACKEND/base-de-donnees/supabase/migrations/`.
- Ne modifie jamais une migration existante.
- Chaque migration :
  - active la RLS sur les nouvelles tables ;
  - retire les droits puis les rend colonne par colonne ;
  - utilise des fonctions `security definer` avec un `search_path` vide ;
  - ajoute un scénario dans `2-BACKEND/base-de-donnees/tests/`.
- Après chaque migration, régénère les types (`pnpm db:types`).

**Le paiement passe par Jeko, en simulation pour l'instant.**
- Le seul prestataire de paiement est Jeko. N'en intègre et n'en mentionne aucun autre.
- Tant que je n'ai pas les accès à l'API Jeko, le paiement fonctionne en simulation (`PAIEMENT_MODE=simulation`) :
  - un fournisseur simulé respecte exactement l'interface de `jeko.client.ts` ;
  - il propose une page de test où l'on choisit « réussi », « échoué » ou « abandonné » ;
  - il envoie un webhook signé qui suit le même chemin qu'un vrai paiement ;
  - ce mode est impossible à activer en production.

**Les performances.**
- Les pages publiques (accueil, catalogue, fiches, pages par ville, FAQ) restent statiques ou revalidées toutes les 5 minutes.
- `force-dynamic` est réservé aux pages privées.
- Les images arrivent en WebP ou AVIF en trois tailles préparées par l'API.


# 5. La charte visuelle

## Les couleurs

La règle est de **65 % de blanc et 35 % d'orange vif**. Le blanc domine : fonds, cartes, respiration. L'orange porte l'énergie de la marque et guide l'action. Les valeurs vivent dans `jetons.css`, qui fait foi ; aucune couleur n'est écrite en dur dans un composant.

**L'orange vif `#FF6B00` sert à :**
- ce qui fait agir : bouton principal, avec un texte `#111827` dessus (contraste 6,2:1) ;
- ce qui indique où l'on est : onglet, menu actif, étape du tunnel ;
- ce qui met en valeur : véhicules à la une, offres, bandeaux ;
- ce qui rassure : badge Vérifié ;
- les accents graphiques du carrousel d'accueil.

**L'orange foncé `#C2410C` sert à :**
- tout texte orange sur fond blanc (liens, mentions) ;
- les boutons à texte blanc ;
- l'anneau de focus, car l'orange vif n'atteint pas le contraste de 3:1 exigé pour un contour.

**Les autres couleurs :**
- texte principal `#111827` ;
- texte secondaire en gris foncé, avec au moins 4,5:1 de contraste ;
- fond secondaire `#F9FAFB` ;
- bordures gris clair discrètes ;
- états succès, alerte et erreur en tons foncés lisibles.

**Pas de grands aplats orange derrière du texte courant.** Pas de mode sombre sur le site client ; il est permis dans les tableaux de bord vendeur et administrateur, comme dans le modèle de la directive 04.

## La typographie
- Une seule famille chargée localement avec `next/font`, sans requête vers un service externe, en deux graisses (normal et semi-gras). Inter ou Plus Jakarta Sans : demande-moi laquelle avant la partie 4 ; d'ici là, garde la police système.
- Texte courant : 16 px minimum sur mobile. Titres en semi-gras avec un interlettrage légèrement resserré.
- Prix toujours en semi-gras, en couleur de texte principal.

## Les formes et les espaces
- Grille de 4 et 8 px, marges généreuses.
- Rayon de 12 px pour les cartes et les champs, de 8 px pour les petits éléments.
- Ombres très douces et rares, réservées à ce qui flotte : menus, fenêtres, bouton carte/liste, barre d'action mobile.
- Cibles tactiles de 44 px minimum.

## Les photos, les icônes et les illustrations
- **Uniquement de vraies photos**, celles que publient les partenaires : format 4:3 dans les cartes, plein écran dans la galerie.
- **Aucune** illustration, mascotte, image ou icône créée par IA, ni pictogramme décoratif.
- Les seuls pictogrammes tolérés sont fonctionnels (fermer, menu, flèches, afficher le mot de passe, chargement), en trait fin et cohérents, avec `lucide-react`.
- Les logos Google et Apple sont les logos officiels.
- Partout où un modèle de `docs/references-ui` utilise une icône pour décorer, remplace-la par du texte bien composé, une vraie photo ou rien.
- Quand une photo manque : un bloc gris très clair avec le texte « Photo à venir ».
- Le logo n'est jamais redessiné ni déformé. Génère depuis lui le favicon, les icônes de la PWA et l'image de partage WhatsApp (Open Graph).


# 6. Les animations, comme je les veux

**Les principes.**
- Mon exigence numéro un est l'expérience : une interface fluide et dynamique qui captive dès la première seconde.
- Chaque animation explique ce qui se passe (où l'on va, ce qui a changé, ce qui charge). Aucune n'est gratuite.
- `motion` (import `motion/react`) pour toutes les interfaces ; `gsap` avec ScrollTrigger uniquement pour le carrousel de l'accueil.
- N'anime que `transform`, `opacity` et `filter`, jamais la largeur, la hauteur ni la position, pour rester fluide sur un téléphone d'entrée de gamme.
- Tout respecte le réglage « réduire les animations » (`useReducedMotion`) : les mouvements deviennent alors de simples fondus de 120 ms, et le carrousel de l'accueil devient un défilement horizontal classique sans épinglage.

**Les valeurs de référence**, tirées du modèle de connexion que j'ai choisi. Mets-les dans un fichier unique, `commun/ui/src/lib/mouvement.ts`, et réutilise-les partout :
- courbe principale `cubic-bezier(0.23, 1, 0.32, 1)` ;
- micro-interactions : 150 ms ;
- changements d'état et d'écran : 240 ms ;
- ouvertures de panneaux : 280 à 300 ms ;
- entrée d'un contenu : opacité de 0 à 1, décalage vertical de 6 px à 0, flou de 3 px à 0, en 240 ms.

**Les règles par élément :**
- **Boutons** :
  - au survol, la couleur fonce en 150 ms ; à l'appui, ils se réduisent à 0,98 ;
  - pendant un chargement, un indicateur circulaire apparaît dans le bouton, qui garde sa largeur, et le libellé passe au participe (« Réservation en cours… ») ;
  - un bouton désactivé ne s'anime jamais.
- **Onglets** : un indicateur qui glisse sous l'onglet actif en 240 ms, comme dans le modèle de connexion.
- **Champs** :
  - au focus, l'anneau orange foncé apparaît en 150 ms ;
  - les erreurs apparaissent en fondu, avec le message sous le champ ;
  - jamais de tremblement.
  - La jauge du mot de passe se remplit segment par segment.
- **Cartes du catalogue** :
  - sur ordinateur, au survol, elles s'élèvent de 2 px avec une ombre douce, et les points du carrousel de photos apparaissent ;
  - le passage d'une photo à l'autre glisse en 240 ms ;
  - le bouton favori fait un petit rebond (1 → 1,15 → 1 en 200 ms) et se remplit d'orange.
- **Squelettes de chargement** : de la forme exacte du contenu attendu, avec un léger reflet qui passe toutes les 1,5 s (statique si les animations sont réduites). Ils ne font jamais sauter la mise en page.
- **Changements de page et d'étape** :
  - le nouveau contenu entre avec le motif de référence ;
  - dans le tunnel de réservation, les étapes glissent horizontalement en 240 ms, dans le sens de la progression, et la barre de progression se remplit en 300 ms.
- **Prix qui change** : quand le total se recalcule (dates, options, assurance), le chiffre défile vers sa nouvelle valeur en 300 ms et se surligne brièvement d'orange pâle pendant 600 ms. Le client voit ainsi ce qui a changé.
- **Panneaux et fenêtres** :
  - sur mobile, les filtres et les menus montent depuis le bas en 280 ms et se ferment en les faisant glisser vers le bas ;
  - sur ordinateur, les fenêtres apparaissent en fondu avec une légère mise à l'échelle (0,98 → 1).
- **Notifications temporaires** : elles montent et apparaissent en 200 ms, disparaissent seules après 4 s, et se mettent en pause au survol ou au toucher.
- **Succès** : une coche qui se dessine (tracé SVG) en 400 ms, puis le message. C'est un signe fonctionnel, pas une illustration.
- **Tableaux de bord** :
  - la barre latérale se replie en 300 ms (animation par `transform`) ;
  - au premier affichage, les indicateurs comptent jusqu'à leur valeur en 600 ms ;
  - les graphiques se tracent en 400 ms ;
  - plus rien ne bouge ensuite, sauf ce qui change.
- **Messagerie** : un nouveau message glisse depuis le bas en 150 ms ; l'indicateur « en train d'écrire » pulse doucement.
- **Bascule carte / liste** : fondu croisé de 200 ms.
- **Attente du paiement** : pendant le réveil possible de l'API, des messages successifs rassurent (« Connexion au service de paiement… », puis « Encore quelques secondes… ») au lieu d'un écran figé.


# 7. De vraies données, et tous les états

**Ce qui s'affiche vient de Supabase.**
- Aucune donnée de démonstration, aucun tableau en dur, aucun faux avis, aucun faux témoignage, aucun chiffre inventé, aucune image de banque d'images (Unsplash ou autre).
- Retire tout cela des modèles de `docs/references-ui`.
- Les seules données préchargées autorisées sont les référentiels réels de `seed.sql` : villes, communes, catégories, marques, modèles, équipements.

**Chaque écran a quatre états soignés :**
- **Chargement** : squelette.
- **Vide** : message utile et action proposée, par exemple « Aucun véhicule n'est encore disponible à Cocody pour ces dates », suivi d'une suggestion.
- **Erreur** : message traduit par `traduireErreur` et bouton « Réessayer ».
- **Rempli.**


# 8. Ta méthode de travail, et la mise sur Git

Pour chaque partie de la section 10, procède exactement ainsi.

1. **Préparer**
   - `git checkout main`, puis `git pull`.
   - Crée une branche nommée `partie-<numéro>-<nom>`, par exemple `partie-2-vendeur`.
   - Relis les directives et les en-têtes des fichiers concernés.
2. **Présenter un plan court** : écrans, composants, données, migrations éventuelles, questions.
   - Si le plan contient une décision qui me revient (section 11), pose-moi la question et attends ma réponse avant d'écrire le code concerné.
   - Pour le reste, avance sans attendre.
3. **Développer par petites étapes**, avec des commits fréquents et lisibles en français, par exemple « feat(vendeur): éditeur d'annonce, photos par glisser-déposer ».
4. **Base de données**, si la partie en a besoin :
   - Écris une nouvelle migration et son test, et vérifie qu'ils passent.
   - Lance `supabase migration list`.
   - Si la migration ne fait qu'ajouter (tables, colonnes, fonctions, règles) : applique-la en ligne avec `supabase db push` avant de fusionner le code qui l'utilise, et montre-moi le résultat.
   - Si elle supprime, renomme ou modifie des données existantes : demande-moi d'abord.
   - Régénère ensuite les types.
5. **Vérifier** : `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, et les tests SQL si la base a changé. Coche `3-SECURITE/09-checklists/NOUVELLE_FONCTIONNALITE.md`. Contrôle aussi les critères de la section 9.
6. **Documenter**
   - Mets à jour `docs/ETAT_ET_FEUILLE_DE_ROUTE.md` : coche les cases, ajoute ce qui a été fait et comment, note les décisions prises.
   - Mets à jour les en-têtes des fichiers et les README concernés.
7. **Mettre sur le dépôt**
   - Pousse la branche (`git push -u origin <branche>`).
   - Ouvre une demande de fusion avec la CLI GitHub (`gh pr create`). Elle contient : le titre de la partie, le résumé de ce qui a été fait, comment le tester, les migrations appliquées et la checklist cochée.
   - Attends que la CI soit verte (`gh pr checks --watch`), puis fusionne (`gh pr merge --squash --delete-branch`).
   - Reviens sur `main` à jour (`git checkout main`, `git pull`).
   - Si `gh` n'est pas disponible : fusionne en local (`git merge --no-ff`) seulement quand toutes les vérifications passent, puis pousse `main`.
   - Vercel et Render redéploient automatiquement à partir de `main`.
8. **Me rendre compte**, en quelques lignes :
   - ce qui est fait ;
   - l'adresse où le tester sur mon téléphone ;
   - ce qui reste ouvert ;
   - la partie suivante, que tu commences ensuite.

**Les règles Git absolues :**
- Ne fusionne jamais une partie dont la CI est rouge. Corrige d'abord.
- N'utilise jamais `--force`, `--no-verify` ni rien qui contourne une vérification ou réécrit l'historique publié.
- Ne désactive aucun test, aucune règle de lint, aucune vérification de sécurité pour « faire passer ».
- Ne committe jamais de secret : les fichiers `.env` restent ignorés, et tu lis les valeurs dans ces fichiers sans jamais les afficher.
- Si je te donne un jeton GitHub, garde-le dans le gestionnaire d'identifiants de Git ou une variable d'environnement, jamais dans un fichier du dépôt ni dans un message.

Quand une information manque, ne l'invente pas : demande-moi, surtout pour les règles métier (montants, délais, commissions, conditions) et les textes légaux. Pour les choix purement visuels, décide toi-même en suivant ce prompt et mes directives, et explique ton choix en une phrase.


# 9. Une partie n'est terminée que si

- Build, lint, vérification des types et tous les tests passent, en local comme en CI.
- Chaque écran fonctionne avec de vraies données et possède ses quatre états.
- C'est agréable sur un téléphone de 360 px comme sur un grand écran, au doigt comme au clavier, et lisible par un lecteur d'écran.
- Les contrastes respectent WCAG 2.2 AA, le focus est visible, les libellés de champs sont toujours visibles.
- Les animations suivent la section 6 et respectent « réduire les animations ».
- Sur mobile en 4G, les pages publiques visent : affichage principal en moins de 2,5 s, réaction au toucher en moins de 200 ms, stabilité visuelle sous 0,1 ; et sur Lighthouse mobile, 90 en performance et 100 en accessibilité.
- Aucun secret n'apparaît dans le frontend ni dans Git, et aucune donnée personnelle dans les journaux.
- Toute nouvelle table a sa RLS et son test.
- Le document d'état, les en-têtes et les README sont à jour.
- La partie est fusionnée dans `main` et déployée.


# 10. Ce qui reste à faire, partie par partie

## Partie 1-bis — Finir le socle (à faire en premier)

- **Back-office** : dans la mise en page serveur de l'administrateur, vérifie, en plus de `getUser()`, le rôle d'équipe et la session `aal2` avec `staff_mfa_status()`. Un simple client connecté ne doit voir aucun écran d'administration ; il voit une page « Accès réservé à l'équipe ».
- **`clientNavigateur()`** : l'adresse factice ne sert que pendant le build. En fonctionnement, une variable manquante doit produire une erreur claire.
- **Node 22** : remets les scripts pour Node 22, comme sur Render et dans `.nvmrc`.
- **`force-dynamic`** : garde-le uniquement sur les pages privées.
- **Panneau de marque des pages de connexion** : confirme qu'il n'affiche que le logo, une vraie photo issue de la plateforme ou les vrais chiffres de `get_platform_stats`.
- **Migration `20261108000100`** : vérifie qu'elle a un test SQL et qu'elle est appliquée en ligne.
- **API en mode simulation** : rends facultatives dans `noyau/config/env.ts` les variables de Jeko, FNE, KYC et IA tant que leurs services ne sont pas branchés. Restent obligatoires : Supabase, `CRON_SECRET` et `PAYOUT_ENCRYPTION_KEY`.
- **Fournisseur de paiement simulé** : crée-le maintenant, sélectionné par `PAIEMENT_MODE`, comme décrit en section 4.
- **Valeurs du mouvement** : crée `commun/ui/src/lib/mouvement.ts` avec les valeurs de la section 6, et fais-les utiliser par les pages d'authentification existantes.

## Partie 1-ter — Premier déploiement

Prépare et guide le premier déploiement, pour découvrir les problèmes d'hébergement tant que l'application est simple.

**Vercel**
- Trois projets, avec pour racines `1-FRONTEND/client`, `1-FRONTEND/vendeur` et `1-FRONTEND/administrateur`, en offre gratuite.
- Variables : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SSO_ACTIVE=false`.

**Render**
- Le service `api` via `render.yaml`, avec `PAIEMENT_MODE=simulation`.

**Supabase**
- Les trois adresses `…vercel.app` dans les URL de redirection.
- `optional/cron.sql` et `optional/cron_render.sql` exécutés, avec les secrets du coffre.

**GitHub**
- Les secrets `SUPABASE_DB_URL` et `BACKUP_PASSPHRASE` pour la sauvegarde nocturne, puis une restauration testée.

**Comment procéder**
- Si je te connecte aux CLI Vercel et Render, fais-le toi-même. Sinon, donne-moi les étapes une par une, avec les valeurs à copier (sauf les secrets, que je saisis moi-même).
- Vérifie ensuite depuis les vraies adresses : inscription, connexion, code par e-mail, activation du TOTP de l'administration.

## Partie 2 — Espace vendeur (`pro.`), avec la directive 04

Elle passe avant le site public : les partenaires y publieront les vrais véhicules.

**Mise en page des tableaux de bord**
- Inspirée de `docs/references-ui/04-tableaux-de-bord/dashboard-with-collapsible-sidebar.tsx`.
- Barre latérale repliable.
- Sélecteur d'agence (un utilisateur peut appartenir à plusieurs partenaires).
- Menu selon le rôle :
  - owner : tout ;
  - manager : tout sauf l'équipe ;
  - agent : opérations seulement, sans prix ni versements.
- Menu : Tableau de bord, Flotte, Annonces, Calendrier, Réservations, Remise, Ventes, Messages, Avis, Versements, Factures, Équipe, Profil public, Sécurité.
- Sur mobile : menu en tiroir et barre d'actions en bas.
- Navigation lisible par le texte ; mode sombre facultatif.

**Devenir partenaire** (`/devenir-partenaire`) : un parcours en cinq étapes avec barre de progression.
1. Le type : agence de location, particulier loueur, concessionnaire ou particulier vendeur, présentés en cartes de texte sans pictogramme.
2. L'identité légale : raison sociale, et RCCM et NCC obligatoires pour les professionnels (erreur `RCCM_REQUIRED`), via `become_partner`, `partner_private`.
3. Les documents (RCCM, pièce du gérant, attestation d'assurance), envoyés dans le bucket privé et la table `partner_documents`, avec aperçu et remplacement.
4. Le compte de versement, envoyé à `POST /vendeur/versements/comptes` (à développer : chiffrement puis insertion avec le jeton du partenaire). Message clair : « Pour votre sécurité, ce compte sera utilisable dans 72 heures. »
5. Le suivi de validation : en attente, validé ou refusé avec motif. Le brouillon est enregistré à chaque étape.

**Tableau de bord business**
- Indicateurs de `get_partner_kpis` : revenus, taux d'occupation, réservations, note, taux de réponse, avec des filtres de période et de catégorie.
- Courbe des revenus avec `get_partner_revenue_series`.
- Liste de tâches automatique avec `get_partner_todos` : demandes à accepter, remises du jour, documents qui expirent, avis à répondre. Chaque tâche est un lien direct vers l'action.
- État vide : « Ajoutez votre premier véhicule » avec le bouton.

**Flotte**
- Liste avec statut en temps réel (`vehicles.fleet_status` : disponible, loué, en maintenance, hors service) et pastilles colorées.
- Ajout d'un véhicule :
  - marque puis modèle en cascade (`MODEL_MAKE_MISMATCH`) ;
  - année, finition, carburant, boîte, places, kilométrage, agence de rattachement ;
  - plaque et numéro de série dans `vehicle_private`, jamais publics.
- Fiche du véhicule :
  - documents avec dates d'expiration et alertes (`vehicle_documents`) ;
  - carnet d'entretien (`vehicle_maintenance_logs`) ;
  - équipements (`vehicle_equipment`) ;
  - historique des locations.

**Annonces et éditeur fluide**
- Liste par statut : brouillon, en revue, publiée, en pause, vendue.
- Éditeur, location (`rental_terms`) :
  - prix par jour, remises semaine et mois ;
  - caution et mode de caution ;
  - kilométrage inclus ;
  - âge et ancienneté de permis minimum ;
  - livraison ; chauffeur disponible.
- Éditeur, vente (`sale_terms`) : prix, négociable, garantie (seulement avec contrat écrit), historique.
- Photos par glisser-déposer :
  - angles guidés (avant, arrière, côtés, trois-quarts, intérieur, tableau de bord) ;
  - compression en WebP dans le navigateur ;
  - envoi à `POST /vendeur/photos` (à développer : vrai type, conversion en trois tailles, suppression des métadonnées GPS, empreinte anti-copie) ;
  - au moins 4 photos (`NOT_ENOUGH_PHOTOS`), réordonnancement par glisser, choix de la couverture.
- Description, options payantes (`listing_extras`), tarifs saisonniers (`seasonal_prices`).
- Soumission à la revue (`submit_listing_for_review`), pause et reprise (`set_listing_status`), statistiques (`listing_stats_daily`).
- Expérience : enregistrement automatique, aperçu « comme le client le verra », jauge de complétude.

**Les autres écrans**
- **Calendrier** : vue par véhicule, blocages manuels (`availability_blocks`), réservations visibles.
- **Réservations reçues** :
  - à accepter dans les 24 h (`respond_to_booking`), puis confirmées, en cours, terminées ;
  - la fiche montre le statut de vérification du conducteur, jamais l'image de ses documents.
- **Équipe** : invitations par e-mail (`invite_partner_member`, envoi par `POST /vendeur/equipe/invitations/:id/envoyer`), acceptation (`accept_partner_invitation`), rôles.
- **Profil public et agences** : logo, couverture, description, points de retrait avec horaires et position (`partners`, `partner_locations`).
- **Versements** : comptes (4 derniers chiffres, « utilisable à partir du… »), historique (`payouts`, `payout_items`).
- **Factures et relevés.**
- **Sécurité du compte** : double authentification conseillée au propriétaire, sessions, historique des connexions.

## Partie 3 — Back-office administrateur (`admin.`), avec la directive 04

- **Tableau de bord** : nombre d'éléments dans chaque file (vérifications d'identité, partenaires, annonces, signalements, litiges, tickets), argent du jour, alertes de sécurité.
- **Validation des partenaires** :
  - documents via `GET /administrateur/documents/:id/lien` (à développer : lien signé de 5 minutes, consultation journalisée avec motif) ;
  - décision avec motif (`verify_partner`).
- **Vérifications d'identité** :
  - pièce, permis et selfie dans une visionneuse sécurisée (filigrane, sans téléchargement) ;
  - pré-contrôle IA affiché comme indication ;
  - décision humaine (`decide_kyc`, `review_user_document`).
- **Modération** :
  - annonces (`moderate_listing`) et certification des véhicules en vente (`certify_sale_listing`) ;
  - photos, avec les doublons détectés ;
  - messages et avis signalés ;
  - une file unifiée (`moderation_flags`, `resolve_flag`).
- **Utilisateurs** : fiche, sanctions (`user_sanctions`), liste noire hachée (`blocklist`), signaux de fraude.
- **Réservations** : recherche et historique des statuts (`booking_status_history`).
- **Argent** :
  - paiements et webhooks reçus (`payments`, `payment_events`) ;
  - remboursements via `POST /administrateur/remboursements`, avec validation par une seconde personne au-delà d'un seuil ;
  - cautions (`deposits`) ;
  - versements par lot via `POST /administrateur/versements/lot`, refusés pendant la période de carence ;
  - factures avec leur état de certification FNE.
- **Litiges** : pièces des deux parties, états des lieux, messages, décision et partage de la caution (`disputes`, `dispute_evidence`).
- **Support** : tickets, réponses, priorité urgente ou standard (`support_tickets`, `support_messages`).
- **Sécurité** :
  - pilotage des agents IA : mode off, observation, assistance ou auto ; seuils ; budget ; version du prompt ; journal des décisions (`ai_agents`, `ai_jobs`, `ai_agent_runs`) ;
  - signaux de fraude, journal des connexions (`security_events`) ;
  - registre des violations de données (`data_incidents`) ;
  - demandes « vie privée » (`privacy_requests`) ;
  - journal d'audit en lecture seule.
- **Référentiels** : villes, communes, catégories, marques, modèles, équipements, options, formules d'assurance.
- **Contenus** : FAQ, pages, documents légaux versionnés.
- **Réglages** (`platform_settings`) : TVA, frais de service, commission, délais, plafond Jeko, période de carence.
- **Équipe interne** : rôles (`user_roles`), deux administrateurs au maximum.

## Partie 4 — Site public client (`www.`), avec les directives 02 et 03

**Mise en page publique**
- Barre de navigation : logo, Louer, Acheter, Vendre, espace utilisateur, connexion.
- Pied de page : liens légaux, contact, WhatsApp.
- Bandeau de cookies : aucune mesure d'audience avant accord (`consents`).
- Pages 404 et 500 à la charte.

**Accueil**, inspiré de `docs/references-ui/02-page-accueil/dish-orbit-carousel.tsx` (avec GSAP et ScrollTrigger) : les véhicules à la une défilent devant le client.
- La section s'épingle, et chaque portion de défilement amène le véhicule suivant sur une large orbite.
- Le titre à deux graisses (marque en ligne fine, modèle en ligne forte) s'efface et revient.
- La carte du partenaire (logo, badge Vérifié, note) et le badge de prix apparaissent en fondu.
- L'arc coloré prend la couleur d'accent du véhicule.
- On peut aussi naviguer avec les flèches, les vignettes, le clavier et le glissement du doigt.
- Données : `search_listings` (annonces publiées avec `is_featured`) — vraie photo de couverture, prix par jour ou total, description courte, équipements en puces. Un clic ouvre la fiche.
- Si la photo n'est pas détourée, cadre-la élégamment ; ne la remplace jamais.
- S'il n'y a aucun véhicule à la une, le carrousel se masque proprement.

Le reste de l'accueil :
- moteur de recherche à onglets Location (lieu et dates) et Achat (budget, marque) ;
- catégories visuelles en vraies photos ;
- offres du moment (`offer_discount_pct`) ;
- bloc de réassurance rédigé en texte, sans pictogrammes.

La page est revalidée toutes les 5 minutes.

**Catalogue `/recherche`**
- Rappel du contexte (lieu et dates, ou type d'achat) et filtres rapides en puces.
- Panneau de filtres complet :
  - mode, budget au curseur double (utilisable au clavier), ville et rayon ;
  - marque, modèle, année, carburant, boîte, places ;
  - type de vendeur, livraison, siège bébé, animaux, avec chauffeur, garanti ou certifié.
- Les filtres vivent dans l'adresse de la page (partageable) et sont validés par `filtresCatalogue`.
- Bascule liste et carte : sur ordinateur, la liste à gauche et la carte à droite ; sur mobile, un bouton flottant. La carte montre la commune, jamais l'adresse exacte. Le fournisseur de cartes est à me demander.
- Tri : pertinence, prix croissant et décroissant, kilométrage, proximité, note.
- Pagination par 24, en défilement continu sur mobile.
- Cartes : carrousel de 4 à 5 photos, favori sans quitter la page, badges (Vérifié, Super hôte, Garantie 12 mois seulement si justifiée, Confirmation instantanée), prix par jour et estimation du total.
- Zéro résultat : réinitialiser les filtres et proposer des véhicules similaires (`suggest_similar_listings`).
- Comparateur de 2 à 3 véhicules côte à côte.

**Fiche véhicule**, inspirée de `docs/references-ui/03-fiche-vehicule/product-rail-gallery.tsx`
- Les photos du partenaire pivotent entre les angles réels (`vehicle_photos.angle`) : face, dos, profil, intérieur.
- Rotation automatique jusqu'à la première interaction. « Voir toutes les photos » ouvre la galerie plein écran, qu'on parcourt du doigt.
- N'utilise jamais les illustrations intégrées au modèle.
- La vue détaillée affiche la description complète et tout le contenu « Fiches véhicules » du cahier des charges :
  - titre (marque, modèle, année, finition) et puces (carburant, boîte, kilométrage, places) ;
  - commune de prise en charge ;
  - bloc location : dates et lieu de restitution, devis transparent (`quote_rental`, prix des jours + options = total, caution, HT et TTC), bouton « Réserver maintenant » qui reste visible en bas de l'écran sur mobile ;
  - bloc vente : prix total, simulateur d'échéances, « Réserver un essai » ou « Contacter le vendeur » (`start_listing_conversation`) ;
  - équipements (confort, technologie, sécurité) ;
  - conditions : annulation, carburant, kilométrage, carnet d'entretien, rapport d'inspection téléchargeable ;
  - profil du partenaire (logo, badge, date d'inscription, taux de réponse) et avis ;
  - véhicules similaires.
- Les coordonnées n'apparaissent qu'après une réservation confirmée (`get_booking_contacts`).
- Ajoute les données structurées pour Google, l'image de partage WhatsApp et le comptage des vues (`track_listing_event`).

**Autres pages**
- Pages référencées par commune et par ville (« location voiture Cocody », « voitures à vendre Abidjan »), plan du site, `robots.txt`.
- Profil public d'un partenaire.
- Page « Vendre » : présentation, puis renvoi vers `pro./devenir-partenaire`.

## Partie 5 — Tunnel de réservation et paiement simulé

La barre de progression porte les titres des étapes a, b, c et d. Les étapes glissent dans le sens de la progression.

**a) Options et assurances**
- Récapitulatif express en haut : dates, lieux, visuel du véhicule.
- Formules d'assurance (`insurance_plans`) : la responsabilité civile est incluse et non décochable ; intermédiaire et tous risques en option.
- Équipements et services : siège enfant ou rehausseur, GPS, conducteur supplémentaire, kilométrage supplémentaire, livraison à domicile, à l'hôtel ou à l'aéroport, chauffeur (`listing_extras`).
- Total recalculé par `quote_rental` à chaque changement, avec l'animation de la section 6.

**b) Conducteur et vérification d'identité**
- Documents déjà validés : on passe à l'étape suivante.
- Sinon :
  - photo du permis recto verso, de la pièce d'identité et selfie, avec un consentement biométrique explicite ;
  - envoi dans le bucket privé ;
  - vérification humaine (`decide_kyc`) tant que le fournisseur de vérification n'est pas choisi.
- Conducteur supplémentaire : mêmes vérifications (`booking_drivers`).
- Messages clairs pour `DRIVER_TOO_YOUNG`, `DRIVER_LICENSE_TOO_RECENT`, `DRIVER_LICENSE_EXPIRED` et les autres refus.

**c) Récapitulatif détaillé et paiement**
- Détail des coûts : location, assurance, options, frais de service, taxes, total.
- Caution : montant et mode (en agence par défaut, Mobile Money remboursable, empreinte carte seulement si Jeko la permet un jour).
- Code promo.
- `create_rental_booking` bloque le calendrier pendant le délai de paiement, avec un compte à rebours visible.
- Bouton « Payer » vers `POST /client/paiements/initier`, puis la page du fournisseur simulé.
- Plafond dépassé : message `AMOUNT_ABOVE_PROVIDER_LIMIT` avec la proposition de contacter l'agence.

**Retour de paiement**
- « Vérification de votre paiement… » : le statut est lu dans la base (interrogation puis temps réel), jamais dans l'adresse de la page.

**d) Confirmation**
- Numéro de réservation et QR code de prise en charge (jeton à usage unique).
- Contrat PDF généré par l'API (`GenerateurContratService`, à développer) et envoyé par e-mail.
- Itinéraire vers le point de retrait, contacts révélés, ajout au calendrier (fichier .ics), partage WhatsApp.

**Annulation, expiration et facture**
- Annulation selon la politique appliquée par `cancel_booking`.
- Expirations automatiques par `pg_cron`.
- Facture affichée « en cours de certification » tant que le client FNE n'est pas branché.

## Partie 6 — Espace client

- **Tableau de bord** (version allégée de la directive 04) : rappels contextuels (`get_my_reminders`) et historique des activités.
- **Mes réservations** :
  - liste et détail : QR code, contrat, facture, état des lieux, annulation, avis ;
  - prolongation : crée la fonction en base (nouvelle migration et test), avec un paiement de type `rental_extension` ;
  - signalement d'un incident : vérifie les droits d'écriture sur `disputes` et ajoute une fonction si nécessaire.
- **Mes achats** : essais, acomptes, demandes de financement.
- **Coffre-fort de documents** : statut (en attente, validé, refusé avec motif), dates d'expiration avec rappel, remplacement.
- **Favoris** et **alertes de recherche** (`saved_searches`, avec une notification quand un véhicule correspond).
- **Paiements et factures**.
- **Notifications** et préférences par canal (`notification_preferences`) ; les alertes de sécurité ne se désactivent pas.
- **Sécurité du compte** : double authentification facultative, appareils et sessions, historique des connexions (`security_events`).
- **Mes données** : export, rectification, opposition (`request_privacy_action`) ; suppression du compte avec 30 jours de délai (`request_account_deletion`, `cancel_account_deletion`).
- **Profil** : la date de naissance est verrouillée après la vérification d'identité.

## Partie 7 — Remise, retour, litiges, avis

- **Remise** :
  - le vendeur scanne le QR code du client avec la caméra (`start_booking`, refusé si le permis n'est pas vérifié) ;
  - il relève le kilométrage et le carburant.
- **États des lieux de départ et de retour** :
  - photos guidées par angle, envoyées à `POST /vendeur/etats-des-lieux/:reservation/photos` (à développer), avec l'heure et le lieu conservés côté serveur comme preuve ;
  - dommages avec gravité (`inspection_damages`) ;
  - signature des deux parties (`sign_inspection`) ;
  - fonctionne sur un réseau faible : les photos sont mises en file d'attente puis envoyées.
- **Retour** : `complete_booking`, puis libération de la caution (`release_due_deposits`) ou ouverture d'un litige.
- **Litiges** : pièces, échanges, décision de l'équipe, partage de la caution.
- **Avis dans les deux sens** :
  - dépôt dans la fenêtre prévue (`submit_review`), réponse publique du partenaire (`respond_to_review`), notes mises à jour (`refresh_partner_stats`) ;
  - critères du badge « Super hôte » à me demander. Proposition : note d'au moins 4,7, au moins 10 locations, taux de réponse d'au moins 90 %, aucune annulation du partenaire sur 6 mois.

## Partie 8 — Parcours vente

- **Réserver un essai** : créneaux, saisie du permis, confirmation (`request_test_drive`, `update_test_drive_status`).
- **Contacter le vendeur** : conversation liée à l'annonce.
- **Acompte de réservation** (`create_sale_reservation`, expiration automatique) :
  - affiche la règle des arrhes ;
  - qui encaisse, la plateforme ou la concession : à me demander.
- **Simulateur de crédit** : taux et durées fournis par un partenaire bancaire (à me demander), taux effectif global affiché, toujours sous le taux d'usure.
- **Demande de financement** (`financing_requests`) et enregistrement de la vente (`record_vehicle_sale`).
- **Badges « Certifié » et « Garantie »** : seulement s'ils sont justifiés.

## Partie 9 — Messagerie et notifications

- **Messagerie contextuelle** :
  - une boîte, avec des fils rattachés à une annonce, une réservation ou un essai ;
  - temps réel, pièces jointes, lu et non lu (`mark_conversation_read`) ;
  - bandeau « Ne payez jamais en dehors de la plateforme » ;
  - les messages signalés par l'agent IA sont affichés comme tels.
- **Centre de notifications** et préférences.
- **Envois par l'API** (`EnvoiNotificationsService` et ses canaux) :
  - e-mails transactionnels à la charte (confirmation, rappel de remise, facture, sécurité) ;
  - notifications push de la PWA (`push_subscriptions`) ;
  - SMS et WhatsApp plus tard.
- **Modèles d'e-mails de Supabase** (code, réinitialisation) en français, avec le logo.

## Partie 10 — Pages institutionnelles

- **À propos** : pourquoi la plateforme est sûre, simple et fiable ; vrais chiffres (`get_platform_stats`) ; équipe ou fondateur ; logos des partenaires avec leur accord. Les textes viennent de moi.
- **FAQ** :
  - recherche prédictive (`search_faq`) ;
  - onglets Location, Vente et achats, Paiement et sécurité, Espace partenaire ;
  - accordéon et vote « utile » (`vote_faq`).
- **Contact et support** :
  - urgent : numéro vert, WhatsApp Business ;
  - standard : formulaire dynamique (numéro de réservation, e-mail) qui crée un ticket ;
  - carte des agences physiques.
- **Documents légaux versionnés** (`legal_documents`) : CGU, conditions de location et de vente, confidentialité selon la loi 2013-450, cookies, mentions légales. Les textes viennent de moi ou de mon avocat.

## Partie 11 — Sécurité IA, qualité, surveillance

- **Agents IA** :
  - clé du modèle et tarifs dans l'API ;
  - agents de sécurité en mode observation pendant 2 semaines, puis en assistance si les évaluations sont bonnes (critères dans `3-SECURITE/05-agents-ia/README.md`) ;
  - synthèse quotidienne envoyée aux administrateurs.
- **Surveillance** : Sentry pour les erreurs, surveillance de disponibilité des quatre adresses.
- **Tests** :
  - tests de l'API sur les routes sensibles (paiement, webhooks, documents) ;
  - scan OWASP ZAP de la recette et checklist manuelle (`3-SECURITE/08-tests-de-securite`) ;
  - audit d'accessibilité et Lighthouse mobile sur les pages clés.
- **Checklist avant lancement** : parcours de `3-SECURITE/09-checklists/AVANT_LANCEMENT.md`.

## Partie 12 — Branchement des services réels (quand je te donne les accès)

- **Jeko** :
  - adapte `jeko.client.ts` à leur documentation, configure le secret du webhook ;
  - teste chaque moyen de paiement : Wave, Orange Money, MTN MoMo, Moov Money, Djamo, carte, QR PI-SPI ;
  - puis passe `PAIEMENT_MODE` à `jeko`.
- **E-mails** : un service SMTP (Brevo ou équivalent) dans Supabase et dans l'API.
- **SMS** : un fournisseur relié à Supabase, puis la vérification du téléphone.
- **Google et Apple** : identifiants OAuth, puis `NEXT_PUBLIC_SSO_ACTIVE=true`.
- **Autres services** : fournisseur de vérification d'identité, client FNE de la DGI, WhatsApp Business, fournisseur de cartes.
- **Lancement** : passage aux offres payantes et au nom de domaine.

## À garder en tête dans chaque partie
- L'application est installable (PWA), et la réservation et le QR code restent consultables sans réseau.
- Tous les textes passent par `@plateforme/i18n`, pour l'anglais à venir.
- La mesure d'audience ne démarre qu'après consentement.
- Les en-têtes des fichiers et le document d'état restent à jour.


# 11. Les décisions qui me reviennent

Pose-moi la question au moment où la partie concernée en a besoin, pas avant :
- la police de caractères ;
- les frais de service, les commissions par type de partenaire, la politique d'annulation (délais et pourcentages) et le montant de caution par catégorie ;
- les critères du badge « Super hôte » ;
- le fournisseur de cartes géographiques ;
- le fournisseur de vérification d'identité ;
- le partenaire bancaire du simulateur de crédit ;
- qui encaisse les acomptes de vente ;
- les textes : À propos, FAQ, documents légaux ;
- le nom de domaine, le numéro vert et le numéro WhatsApp Business.

Note chaque décision dans `docs/ETAT_ET_FEUILLE_DE_ROUTE.md`.


# 12. Ce que tu ne dois jamais faire

- Mettre une clé secrète, ou un appel à la clé secrète, dans le frontend.
- Calculer côté navigateur un prix qui sera facturé.
- Faire confiance à la page de retour de paiement.
- Valider un paiement autrement que par un webhook signé au bon montant.
- Désactiver la RLS, modifier une ancienne migration, ou te fier au proxy pour la sécurité.
- Intégrer un autre prestataire de paiement que Jeko.
- Laisser une donnée de démonstration, une image de banque d'images, une illustration ou une icône générée par IA.
- Inventer un avis, un témoignage, un chiffre, un partenaire ou une règle métier.
- Supprimer automatiquement un contenu, ou laisser une IA valider seule une pièce d'identité.
- Journaliser un mot de passe, un code, un numéro de carte, un numéro de document ou le contenu d'un message.
- Fusionner une partie dont la CI est rouge, forcer un push, ou contourner une vérification.


# 13. Commence maintenant

1. Lis les fichiers de la section 2.
2. Fais-moi ton résumé en quelques lignes.
3. Enchaîne avec la partie 1-bis en suivant la méthode de la section 8 : plan, développement, vérifications, mise sur le dépôt.
4. Passe ensuite à la partie 1-ter, puis à la partie 2.
