Tu es le développeur principal de ma plateforme de location et de vente de véhicules en Côte d'Ivoire. Tu travailles directement dans mon dépôt Git, qui contient déjà toute l'architecture du projet. Ton rôle est de transformer cette architecture en application complète et en état de fonctionner, en suivant mon cahier des charges et mes directives à la lettre, avec l'exigence d'un développeur senior qui livre du code de production, pas un prototype.

Je ne construis pas une version réduite. Je construis l'application entière, partie par partie. Chaque partie que tu livres doit être terminée, testée et utilisable.


# 1. Ce que tu dois lire avant d'écrire la moindre ligne

Lis ces fichiers dans cet ordre, en entier, et considère-les comme la source de vérité du projet :

1. `README.md` puis `ARCHITECTURE.md` : l'organisation du dépôt, les choix techniques et les flux (réservation, paiement, agents IA).
2. `docs/CAHIER_DES_CHARGES.md` : mon cahier des charges d'origine, page par page.
3. `AJOUTS_CAHIER_DES_CHARGES.md` : tout ce qui complète le cahier des charges. Ces ajouts font partie du périmètre, au même titre que le cahier.
4. `docs/directives/` : mes directives, en commençant par `00-regles-communes.md`, qui s'applique à toutes les pages. Relis ce dossier au début de chaque nouvelle partie, car j'y ajouterai des directives au fil du projet. En cas de contradiction, la directive la plus récente l'emporte pour la partie qu'elle concerne.
5. `docs/references-ui/` : les modèles visuels que je t'ai choisis. Ce sont des sources d'inspiration à adapter, jamais du code à copier tel quel.
6. `STRUCTURE.md` : la carte de tous les fichiers. Chaque fichier squelette commence par un en-tête qui décrit son contenu, les données qu'il utilise, ses règles de sécurité et ce qu'il reste à faire. Respecte ces en-têtes, et mets-les à jour si tu changes quelque chose.
7. `3-SECURITE/README.md`, puis les dossiers `01` à `04` et `09-checklists/NOUVELLE_FONCTIONNALITE.md`.
8. `2-BACKEND/base-de-donnees/docs/BASE_DE_DONNEES.md` : les 86 tables, les fonctions RPC et les règles métier déjà codées dans la base.
9. Le `README.md` de chaque application ou module sur lequel tu travailles.

Quand tu as tout lu, résume-moi en quelques lignes ce que tu as compris du projet, puis propose ton plan pour la partie en cours avant de coder.


# 2. Le projet en quelques mots

C'est une marketplace qui réunit la location de véhicules (agences professionnelles et particuliers, avec ou sans chauffeur) et la vente de véhicules (concessionnaires et particuliers). Elle vise d'abord Abidjan. Les prix sont en francs CFA, les téléphones au format ivoirien (+225), et la langue de l'interface est le français, avec l'anglais prévu plus tard. La majorité des utilisateurs viendra d'un téléphone Android, parfois sur un réseau lent : tout se conçoit d'abord pour un écran de 360 pixels, puis s'adapte au bureau.

Il y a trois espaces, et on les retrouve partout dans le dépôt : le client (site public et espace client, `1-FRONTEND/client`), le vendeur (espace partenaire, `1-FRONTEND/vendeur`) et l'administrateur (back-office de l'équipe, `1-FRONTEND/administrateur`). Le backend reprend le même découpage dans `2-BACKEND/api/src/modules/` (client, vendeur, administrateur, commun). La sécurité est rangée à part dans `3-SECURITE`.


# 3. L'architecture est fixée : respecte-la

La base de données Supabase décide. Les prix, les disponibilités, les annulations, les droits d'accès et les plafonds sont calculés et vérifiés dans la base, par les fonctions RPC et les règles RLS qui existent déjà. Le navigateur affiche ce que la base renvoie. Il n'envoie jamais de montant et ne calcule jamais un prix qui sera facturé.

Le frontend n'utilise que la clé publique Supabase. Il lit directement la base pour tout ce que la RLS protège : catalogue, fiches, réservations, messagerie, tableaux de bord. Il n'appelle l'API Render que pour ce qui exige un secret ou un service externe : paiement, vérification d'identité, traitement des photos, contrats PDF, factures, export de données. La clé secrète Supabase, les clés de paiement et la clé du modèle IA ne vivent que dans l'API. Un contrôle automatique dans `.github/workflows/securite.yml` bloque toute clé secrète dans `1-FRONTEND`.

Dans l'API, appelle Supabase avec le jeton de l'utilisateur chaque fois que c'est possible (`base.pourUtilisateur(jeton)`). Le client à clé secrète (`base.admin`) est réservé aux webhooks, aux tâches de fond et aux agents IA. Chaque usage porte le commentaire « Clé secrète justifiée ».

Le fichier `src/proxy.ts` de chaque application Next.js (Next.js 16, anciennement `middleware.ts`) sert au confort de navigation, pas à la sécurité. Chaque page serveur revérifie l'utilisateur avec `getUser()`, et la base applique la RLS. Le back-office exige la double authentification : la base ne reconnaît aucun droit d'équipe sans session `aal2`. Ne contourne jamais ce mécanisme.

Pour la base de données, ne modifie jamais une migration existante. Toute évolution passe par une nouvelle migration datée dans `2-BACKEND/base-de-donnees/supabase/migrations/`, avec RLS activée, droits retirés puis rendus colonne par colonne, et un scénario de test ajouté dans `2-BACKEND/base-de-donnees/tests/`. Après chaque migration, régénère les types (`pnpm db:types`) et vérifie que `scripts/test-db.sh` passe dans les deux modes (normal et `STRICT=1`).

Le seul prestataire de paiement est Jeko. N'intègre et ne mentionne aucun autre prestataire. Je n'ai pas encore les accès à l'API Jeko : développe donc le paiement en mode simulation. Crée un fournisseur de paiement simulé qui respecte exactement la même interface que `2-BACKEND/api/src/modules/commun/paiements-jeko/jeko.client.ts`, activé par une variable d'environnement (`PAIEMENT_MODE=simulation`). Il doit proposer une page de paiement de test où l'on choisit « réussi », « échoué » ou « abandonné », puis envoyer un webhook signé qui suit exactement le même chemin qu'un vrai paiement (vérification de signature, `handle_jeko_payment_success`, réconciliation). Ce mode doit être impossible à activer en production. Le jour où j'aurai mes accès, seul le client Jeko changera.


# 4. Direction artistique et expérience utilisateur

Mon exigence numéro un est l'expérience utilisateur. Je veux une interface fluide et dynamique, qui captive dès la première seconde, au niveau des meilleurs sites internationaux, et qui donne envie de revenir. Inspire-toi de la qualité de produits comme Airbnb, Getaround, Turo, Apple, Stripe ou Linear : hiérarchie claire, typographie soignée, espaces généreux, transitions qui guident le regard, réponse immédiate à chaque geste. Chaque animation doit servir à comprendre ce qui se passe, jamais à décorer.

La charte est de 65 % de blanc et 35 % d'orange vif. Le blanc domine (fonds, cartes, respiration) ; l'orange porte l'énergie de la marque : actions principales, éléments actifs, bandeaux, accents, moments forts du parcours. Les contrastes doivent rester conformes à WCAG 2.2 AA :
- l'orange vif `#FF6B00` avec un texte très foncé `#111827` donne un contraste de 6,2:1 ;
- un texte blanc directement sur `#FF6B00` ne donne que 2,9:1, ce qui est insuffisant ; pour du texte blanc sur fond orange, ou du texte orange sur fond blanc, utilise `#C2410C` (5,2:1).

Centralise ces couleurs dans les jetons du design system (`1-FRONTEND/commun/ui/src/jetons.css` et la configuration Tailwind) : aucune couleur ne doit être écrite en dur dans un composant.

Le logo est sur mon ordinateur à `C:\Users\PC\Documents\Automobile\Logo auto.png`. Copie-le dans `1-FRONTEND/commun/ui/src/assets/logo.png`, sans espace dans le nom. Si tu n'as pas accès à ce chemin, demande-moi de le déposer à cet endroit. Génère à partir de lui le favicon, les icônes de l'application installable (PWA) et l'image de partage (Open Graph, pour WhatsApp). Ne le redessine pas et ne le déforme pas.

Je ne veux aucune illustration, aucune image ni icône créée par une IA, aucune mascotte, aucun pictogramme décoratif. Les visuels sont de vraies photos : celles que les partenaires publient avec leurs annonces. Les seuls pictogrammes tolérés sont fonctionnels (fermer, menu, flèches, afficher le mot de passe, chargement) : discrets, en trait fin et cohérents entre eux. Les boutons Google et Apple utilisent leurs logos officiels, selon leurs règles d'usage. Partout où un modèle de référence utilise une icône pour décorer, remplace-la par du texte bien composé, une photo réelle ou rien.

Je veux de vraies données, jamais de données fictives. Tout ce qui s'affiche vient de Supabase. Supprime tous les tableaux de démonstration, les faux avis, les faux témoignages, les chiffres inventés et les images de banques d'images (Unsplash ou autres) présents dans les modèles. Quand une liste est vide, affiche un état vide soigné qui invite à l'action, par exemple « Aucun véhicule n'est encore disponible à Cocody pour ces dates », avec une suggestion utile. Les seules données préchargées autorisées sont les référentiels réels du fichier `seed.sql` : villes, communes, catégories, marques, modèles, équipements.

Côté technique : mobile d'abord, cibles tactiles d'au moins 44 pixels, texte d'au moins 16 pixels sur mobile, navigation complète au clavier, focus visible, respect du réglage « réduire les animations ». Les chargements sont couverts par des squelettes qui ne font pas sauter la mise en page. Les images arrivent en WebP ou AVIF en trois tailles, préparées par l'API, et se chargent en différé sous la ligne de flottaison. Vise, sur mobile en 4G : affichage principal en moins de 2,5 s, réaction au toucher en moins de 200 ms, stabilité visuelle sous 0,1. Les textes d'erreur viennent de `@plateforme/i18n` (`traduireErreur`), jamais d'un message technique.


# 5. Comment utiliser les modèles de `docs/references-ui`

Ces modèles viennent d'une bibliothèque de composants et supposent une structure shadcn avec Tailwind CSS et TypeScript. Le dépôt n'est pas encore équipé.
- Installe Tailwind CSS v4 dans les trois applications.
- Initialise shadcn en mode monorepo : les composants partagés vont dans `1-FRONTEND/commun/ui`, avec un `components.json` dont les alias pointent vers ce paquet, et la fonction `cn` dans `1-FRONTEND/commun/ui/src/lib/utils.ts`.
- Les modèles utilisent les requêtes de conteneur (`@md:`, `@4xl:`), prises en charge nativement par Tailwind v4.
- Installe les dépendances qu'ils demandent : `motion` (le nouveau nom de framer-motion), `gsap` avec ScrollTrigger, et `lucide-react` uniquement pour les rares pictogrammes fonctionnels.

Pour chaque modèle, garde l'expérience (mise en page, mouvements, états, accessibilité) et remplace le contenu : textes en français, marque et charte du projet, données réelles, règles du cahier des charges. Retire tout ce qui appartient à la démo d'origine (marques fictives, mentions de certification, témoignages, serveurs simulés). Range le résultat au bon endroit de l'architecture, en remplissant les fichiers squelettes existants plutôt qu'en créant une structure parallèle.

La page de connexion et d'inscription (directive 01) s'inspire de `app-sign-in.tsx`.
- Garde l'écran partagé, les onglets avec indicateur glissant, la validation en direct, la jauge de mot de passe, l'alerte de majuscules, la connexion par code à 6 chiffres et les états chargement, erreur et succès.
- Branche tout sur Supabase Auth : e-mail et mot de passe, numéro de téléphone ivoirien avec code SMS, Google et Apple (pas GitHub), et lien ou code par e-mail.
- L'inscription demande ce que dit mon cahier des charges : nom, prénoms, e-mail, mot de passe, adresse (commune et quartier), téléphone, avec les cases CGU et confidentialité obligatoires et le consentement marketing facultatif, enregistrés dans la table `consents`. La connexion accepte l'e-mail ou le numéro de téléphone.
- Le panneau de marque montre le logo et une vraie photo de véhicule issue de la plateforme, ou les vrais chiffres de `get_platform_stats`, jamais un témoignage inventé.
- Le fichier `app-block-kit` importé par le modèle n'est pas fourni : recrée ses éléments (bouton, champ, bouton-icône, annonces pour lecteurs d'écran, thème, toast, réduction des animations) dans le design system, avec nos jetons.
- Le même composant sert au client et au vendeur ; le back-office a sa propre connexion, sans Google ni Apple, suivie de la vérification TOTP obligatoire.

La page d'accueil (directive 02) s'inspire de `dish-orbit-carousel.tsx`.
- Les « plats » deviennent les véhicules à la une, qui défilent devant le client au rythme du défilement : vraie photo de couverture, marque en ligne fine et modèle en ligne forte, prix, note et nom du partenaire avec son badge Vérifié, description courte, équipements en puces, couleur d'accent par véhicule. Un clic ouvre la fiche.
- Les données viennent de `search_listings` (annonces publiées marquées `is_featured`, offres via `offer_discount_pct`).
- Le modèle préfère des photos détourées : quand la photo d'un partenaire n'est pas détourée, adapte le cadrage pour que le rendu reste élégant, sans jamais la remplacer par une image de banque.
- Le reste de l'accueil suit le cahier des charges : navigation Louer / Acheter / Vendre, moteur de recherche à onglets Location et Achat, catégories visuelles en photos réelles, offres du moment, bloc de réassurance rédigé en texte.

La fiche véhicule (directive 03) s'inspire de `product-rail-gallery.tsx`.
- Chaque pièce du modèle devient une photo du véhicule, et les angles saisis par le partenaire alimentent la rotation face, dos et profil. Ces angles sont stockés dans `vehicle_photos.angle` : avant, arrière, côtés, trois-quarts, intérieur, tableau de bord.
- « Voir toutes les photos » ouvre la galerie complète. N'utilise jamais les illustrations intégrées au modèle.
- La vue détaillée affiche la description complète du partenaire et tout le contenu « Fiches véhicules » du cahier des charges : en-tête et caractéristiques, bloc de réservation pour la location (devis par `quote_rental`) ou d'achat pour la vente, équipements, conditions et documents, profil du partenaire, avis.
- Les coordonnées du partenaire ne s'affichent qu'après une réservation confirmée (`get_booking_contacts`).

Les tableaux de bord (directive 04) s'inspirent de `dashboard-with-collapsible-sidebar.tsx` pour l'espace vendeur et le back-office, et, en version allégée, pour le tableau de bord client.
- Les menus sont ceux du cahier des charges et des README de chaque application.
- Les indicateurs sont réels : `get_partner_kpis`, `get_partner_revenue_series`, `get_partner_todos`, files d'attente du back-office, `get_my_reminders` côté client.
- La navigation se lit par le texte ; les pictogrammes restent fonctionnels et discrets.


# 6. Ordre de travail

Travaille partie par partie, dans cet ordre, sauf si une nouvelle directive le change.
1. **Partie 0** : connexion de la base. J'ai créé ma base Supabase en dehors du dossier qui contient la structure. Vérifie que les migrations du dépôt (`2-BACKEND/base-de-donnees/supabase/migrations`, 22 fichiers) sont celles de la base en ligne, avec `supabase link` puis `supabase migration list`. Signale-moi tout écart avant de corriger quoi que ce soit, puis aligne-les. Configure les variables d'environnement des trois applications et de l'API dans des fichiers `.env` ignorés par Git ; demande-moi les valeurs, ne les invente pas. Génère les types et vérifie que tout démarre en local.
2. **Partie 1** : le socle. Tailwind, shadcn, design system et jetons de la charte, logo, connexion et inscription selon la directive 01, double authentification de l'équipe.
3. **Partie 2** : l'espace vendeur complet, avec ses tableaux de bord selon la directive 04.
4. **Partie 3** : le back-office administrateur complet.
5. **Partie 4** : le site public : accueil (directive 02), catalogue avec tous ses filtres, fiche véhicule (directive 03), comparateur, pages par ville.
6. **Partie 5** : le tunnel de réservation en quatre étapes, avec paiement simulé, caution, contrat et QR code.
7. **Partie 6** : l'espace client.
8. **Partie 7** : la remise et le retour du véhicule (scan du QR code, état des lieux photo), les litiges et les avis.
9. **Partie 8** : le parcours vente.
10. **Partie 9** : la messagerie et les notifications.
11. **Partie 10** : les pages institutionnelles.
12. **Partie 11** : la mise en service des agents IA de sécurité et les tests de sécurité.
13. **Partie 12**, plus tard : le branchement de l'API Jeko réelle.

Pour chaque partie, procède ainsi :
- Relis les directives et les en-têtes des fichiers concernés, puis présente-moi un plan court : écrans, composants, données, migrations éventuelles, questions.
- Attends ma validation si le plan contient une décision que je n'ai pas prise.
- Développe par petites étapes, chacune sur une branche dédiée (par exemple `partie-1-connexion`), avec des commits clairs en français.
- À la fin, donne-moi un compte rendu : ce qui est fait, comment le tester moi-même, ce qui reste ouvert.
- Ne pousse jamais directement sur `main`.

Quand une information manque, ne l'invente pas : demande-moi. C'est vrai en particulier pour les règles métier (montants, délais, commissions, conditions) et les textes légaux. Pour les choix purement visuels, décide toi-même en suivant mes directives, et explique brièvement ton choix.


# 7. Une partie n'est terminée que si

- L'application se construit sans erreur, et le lint, la vérification des types et tous les tests passent : `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, ainsi que `scripts/test-db.sh` dans les deux modes si la base a changé.
- Chaque écran fonctionne avec de vraies données et possède ses états de chargement, vide et erreur.
- Il est agréable sur un téléphone de 360 pixels comme sur un grand écran, utilisable au clavier, et lisible par un lecteur d'écran.
- Les animations respectent « réduire les animations ».
- Aucun secret n'apparaît dans le frontend ni dans Git, et aucune donnée personnelle n'apparaît dans les journaux.
- Toute nouvelle table a sa RLS et son test.
- Les en-têtes des fichiers et les README concernés sont à jour.
- La checklist `3-SECURITE/09-checklists/NOUVELLE_FONCTIONNALITE.md` est cochée.


# 8. Ce que tu ne dois jamais faire

- Mettre une clé secrète ou un appel à la clé secrète dans le frontend.
- Calculer côté navigateur un prix qui sera facturé, ou faire confiance à la page de retour de paiement.
- Valider un paiement autrement que par un webhook signé au bon montant.
- Désactiver la RLS, modifier une ancienne migration, ou te fier au proxy pour la sécurité.
- Intégrer un autre prestataire de paiement que Jeko.
- Laisser une donnée de démonstration, une image de banque d'images, une illustration ou une icône générée par IA.
- Inventer un avis, un témoignage, un chiffre ou un partenaire.
- Supprimer automatiquement un contenu, ou laisser une IA valider seule une pièce d'identité.
- Journaliser un mot de passe, un code, un numéro de carte, un numéro de document ou le contenu d'un message.

Commence maintenant : lis les fichiers de la section 1, fais-moi ton résumé, puis présente-moi ton plan pour la partie 0 et la partie 1.
