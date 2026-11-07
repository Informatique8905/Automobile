# Modèle de menaces

*À relire à chaque nouvelle fonctionnalité importante (voir `09-checklists/NOUVELLE_FONCTIONNALITE.md`).*

## 1. Ce qu'on protège (les actifs)

| Actif | Pourquoi c'est précieux |
|---|---|
| **Les véhicules** | Un véhicule loué sous fausse identité puis revendu = perte de plusieurs millions de FCFA pour un partenaire |
| **L'argent** | Paiements, cautions, versements aux partenaires |
| **Les pièces d'identité et permis** | Données très sensibles (loi 2013-450), recherchées pour l'usurpation d'identité |
| **Les comptes** | Un compte partenaire piraté permet de détourner les versements ; un compte admin, tout |
| **La confiance** | Une seule arnaque médiatisée peut tuer la plateforme |
| **Les clés secrètes** | Clé Supabase secrète, clé Jeko, clé IA |

## 2. Qui attaque

| Acteur | Motivation | Moyens typiques |
|---|---|---|
| Escroc « locataire » | Voler un véhicule | Faux documents, identité empruntée, location longue puis revente |
| Escroc « vendeur » | Encaisser sans livrer | Fausse annonce, photos volées, demande d'avance par Wave |
| Contourneur | Éviter la commission | Échange de numéros, paiement en direct |
| Pirate opportuniste | Argent rapide | Mots de passe réutilisés, hameçonnage, faux SMS de paiement |
| Concurrent / robot | Copier le catalogue, les contacts | Aspiration automatique |
| Personne interne | Fraude, curiosité | Accès légitime détourné |

## 3. Les 16 menaces et leurs parades

| # | Menace | Probabilité | Impact | Parades en place | Où |
|---|---|---|---|---|---|
| M1 | **Location sous fausse identité puis vol ou revente du véhicule** | Élevée | Critique | KYC (pièce + selfie + revue humaine), permis vérifié avant remise, QR code de remise, score de risque, liste noire hachée des documents, caution, traceur GPS recommandé | base (`decide_kyc`, `start_booking`, `blocklist`), agent 6 |
| M2 | **Faux paiement** (webhook forgé, faux SMS Wave, capture d'écran) | Élevée | Élevé | Seul un webhook signé valide un paiement ; montant et devise recontrôlés en base ; réconciliation auprès de Jeko ; la page de retour ne prouve rien | `webhooks.ts`, `handle_jeko_payment_success` |
| M3 | **Paiement hors plateforme** demandé par un faux vendeur | Élevée | Élevé | Coordonnées masquées avant réservation ; pré-filtre + agent messagerie ; message d'avertissement « ne payez jamais en dehors » | `get_booking_contacts`, agent 3 |
| M4 | **Annonce frauduleuse** (photos volées, prix trop bas) | Élevée | Élevé | Modération avant publication, empreinte perceptuelle des photos, badge « Vérifié » seulement après KYB | agents 1, 2, 10 |
| M5 | **Piratage d'un compte partenaire puis changement du compte de versement** | Moyenne | Élevé | Délai de carence de 72 h, alerte e-mail, agent de contrôle, double authentification proposée | migration 0500, agent 8 |
| M6 | **Piratage d'un compte de l'équipe** | Moyenne | Critique | Double authentification **obligatoire** appliquée dans la base, domaine séparé, session courte, audit inviolable | migration 0200, `administrateur/src/proxy.ts` |
| M7 | **Fuite de la clé secrète Supabase** | Faible | Critique | Clé uniquement sur Render ; contrôle automatique du frontend ; analyse des secrets ; procédure de rotation | `securite.yml`, `07-reponse-aux-incidents` |
| M8 | **Accès aux pièces d'identité d'un autre utilisateur** | Faible | Critique | Espaces de stockage privés, RLS par propriétaire, liens signés de courte durée, accès de l'équipe journalisé | migration 1500, API admin |
| M9 | **Force brute / réutilisation de mots de passe** | Élevée | Moyen | Limites Supabase Auth, CAPTCHA, journal de sécurité, agent 7, connexion par code SMS | `security_events`, agent 7 |
| M10 | **Injection de prompt contre les agents IA** | Moyenne | Moyen | Encadrement, règles qui détectent la tentative, JSON strict, seuils en base, aucun effet irréversible | `garde-fous.ts` |
| M11 | **XSS / injection** | Faible | Élevé | React échappe le texte, CSP, aucun SQL écrit à la main côté API (fonctions RPC), validation des entrées | `entetes.ts` |
| M12 | **Aspiration du catalogue et des contacts** | Moyenne | Faible | Aucune coordonnée dans les tables publiques, limites de requêtes, pagination limitée | RLS, `limites.ts` |
| M13 | **Abus d'annulation / remboursement** | Moyenne | Moyen | Politique d'annulation calculée en base, remboursements par l'API seulement, validation à deux au-delà d'un seuil | `cancel_booking`, API admin |
| M14 | **Fichier piégé envoyé** (script déguisé en photo) | Faible | Moyen | Vrai type lu dans les octets, conversion WebP côté serveur, métadonnées supprimées | `fichiers.ts` |
| M15 | **Fraude interne** | Faible | Élevé | Rôles minimaux, audit inviolable, accès aux documents journalisé, validation à deux | migration 0500 |
| M16 | **Violation de données** | Faible | Critique | Registre des incidents, plan de réponse, notification ARTCI et personnes concernées | `data_incidents`, `07-…` |

## 4. Risques acceptés (pour l'instant)

| Risque | Pourquoi accepté | Revoir quand |
|---|---|---|
| Le frontend client utilise une CSP sans nonce | Garder les pages statiques et rapides ; compensé par les autres directives | Si un contenu riche (HTML) est ajouté |
| Données hébergées en Europe | Pas de région Supabase en Afrique | Autorisation ARTCI obtenue ; à revoir si une région africaine ouvre |
| Mise en veille de Render en phase gratuite | Réconciliation + réveil par la base | Passage à Render Starter avant le lancement |
