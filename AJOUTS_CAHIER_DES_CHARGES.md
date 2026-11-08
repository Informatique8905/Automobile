# Ce qu'il faut ajouter au cahier des charges

Votre cahier des charges décrit très bien la **vitrine** (accueil, catalogue, fiches, tunnel de réservation).
Pour une plateforme qui dure, il manque surtout le **moteur** : ce qui fait tourner l'activité au quotidien,
ce qui protège l'argent et ce qui inspire confiance.

**Légende**
- 🟢 déjà prévu dans votre base Supabase — il reste l'écran à construire
- 🆕 ajouté aujourd'hui dans la base (migrations du 6 novembre 2026, testées)
- 🔨 à construire dans l'application (frontend et/ou API)
- **MVP** = indispensable au lancement · **P2** = 6 à 12 mois après · **P3** = plus tard

---

## 1. Côté CLIENT (locataire / acheteur)

| Ajout | Pourquoi c'est important | Statut | Priorité |
|---|---|---|---|
| **Connexion par numéro de téléphone + code SMS ou WhatsApp** | Beaucoup d'utilisateurs ivoiriens utilisent peu l'e-mail ; c'est aussi plus sûr qu'un mot de passe | 🔨 (Supabase Auth « phone ») | MVP |
| **Page « Sécurité du compte »** : double authentification, appareils connectés, historique des connexions | Le client voit et coupe une connexion suspecte | 🆕 `security_events` · 🔨 écran | MVP |
| **Page « Mes données »** : télécharger mes données, rectifier, m'opposer | Obligation de la loi 2013-450 | 🆕 `privacy_requests` · 🔨 écran | MVP |
| **Réservation et QR code disponibles hors connexion** (PWA) | Le réseau coupe souvent au moment de la remise du véhicule | 🔨 | MVP |
| **État des lieux photo au départ et au retour**, signé par les deux parties | Première source de litiges ; protège client et loueur | 🟢 `vehicle_inspections` · 🔨 écran | MVP |
| **Signaler un incident pendant la location** (panne, accident, retard) | Le client a un bouton, pas seulement un numéro | 🟢 `disputes` · 🔨 | MVP |
| **Prolonger une location** depuis l'application | Revenu supplémentaire, évite les retards non déclarés | 🟢 `rental_extension` · 🔨 | P2 |
| **Location avec chauffeur** dans le moteur de recherche | Très demandé à Abidjan (entreprises, aéroport, événements) | 🟢 `with_driver` · 🔨 filtre | MVP |
| **Alertes de recherche** (« prévenez-moi quand un SUV est disponible à Cocody ») | Fait revenir les visiteurs | 🟢 `saved_searches` · 🔨 | P2 |
| **Partage par WhatsApp** d'une annonce ou d'une réservation | Le bouche-à-oreille passe par WhatsApp | 🔨 | MVP |
| **Anglais** en plus du français | Expatriés, diaspora, entreprises internationales | 🔨 (`commun/i18n`) | P2 |
| **Code promo** au moment du paiement | Lancement, partenariats, fidélité | 🟢 `promo_codes` · 🔨 | P2 |

## 2. Côté VENDEUR (espace partenaire)

| Ajout | Pourquoi | Statut | Priorité |
|---|---|---|---|
| **Parcours « Devenir partenaire »** avec dépôt des pièces (RCCM, NCC, CNI) et suivi de validation | Le cahier des charges parle de l'espace partenaire, pas de la porte d'entrée | 🟢 `become_partner`, `partner_documents` · 🔨 | MVP |
| **Scanner le QR code** du client à la remise du véhicule | Remise rapide, preuve de l'heure exacte | 🟢 `start_booking` · 🔨 | MVP |
| **Calendrier de disponibilité** avec blocage manuel (entretien, usage personnel) | Évite les réservations impossibles | 🟢 `availability_blocks` · 🔨 | MVP |
| **Alertes d'expiration** : assurance, visite technique, carte grise | Depuis 2025, pas d'assurance sans visite technique valide | 🟢 `vehicle_documents` · 🔨 to-do automatique | MVP |
| **Comptes de versement protégés** : délai de 72 h, alerte e-mail, contrôle IA | Fraude n° 1 sur les marketplaces : un pirate change le numéro de versement | 🆕 | MVP |
| **Équipe** : inviter des agents avec des droits limités (pas de modification de prix) | Les agences ont plusieurs employés | 🟢 `partner_members` · 🔨 | MVP |
| **Tarifs saisonniers** (fêtes, vacances, Coupe d'Afrique…) | Revenus plus élevés en haute saison | 🟢 `seasonal_prices` · 🔨 | P2 |
| **Statistiques par annonce** (vues, contacts, réservations) | Le partenaire voit ce qui marche | 🟢 `listing_stats_daily` · 🔨 | P2 |
| **Parcours « Vendre » pour un particulier** (annonce guidée, photos imposées par angle) | Votre menu prévoit « Vendre » mais pas le parcours | 🟢 `photo_angle` · 🔨 | MVP |
| **Export comptable** (CSV des réservations, commissions, versements) | Les agences en ont besoin pour leur comptabilité | 🔨 | P2 |

## 3. Côté ADMINISTRATEUR (back-office) — absent des notes, indispensable

| Ajout | Pourquoi | Statut | Priorité |
|---|---|---|---|
| **Connexion avec double authentification obligatoire** | Un mot de passe volé ne doit jamais ouvrir le back-office | 🆕 (appliqué dans la base) | MVP |
| **File de vérification KYC** (pièce, permis, selfie) avec décision humaine | L'IA pré-contrôle, un humain décide | 🟢 `decide_kyc` · 🔨 | MVP |
| **Validation des partenaires** (KYB) | Badge « Vérifié » crédible | 🟢 `verify_partner` · 🔨 | MVP |
| **Modération** : annonces, photos, messages, avis signalés | Arnaques et contournement | 🟢 · 🔨 | MVP |
| **Litiges** : pièces, décision, partage de la caution | Sans outil, chaque litige se règle par téléphone | 🟢 `disputes` · 🔨 | MVP |
| **Paiements, remboursements, cautions, versements** | Suivi de l'argent | 🟢 · 🔨 | MVP |
| **Pilotage des agents IA** : mode, seuils, budget, journal des décisions | Garder la main sur l'IA | 🆕 `ai_agents` · 🔨 | MVP |
| **Journal de sécurité** et **signaux de fraude** | Voir les attaques en cours | 🆕 · 🔨 | MVP |
| **Demandes « vie privée »** et **registre des violations de données** | Obligations ARTCI | 🆕 · 🔨 | MVP |
| **Référentiels et réglages** (villes, catégories, TVA, commissions, délais) | Changer une règle sans développeur | 🟢 · 🔨 | MVP |
| **Journal d'audit** inviolable | Savoir qui a fait quoi, y compris dans l'équipe | 🆕 · 🔨 | MVP |
| **Validation à deux personnes** des remboursements au-dessus d'un seuil | Fraude interne | 🔨 (API) | P2 |

## 4. TRANSVERSE (toute la plateforme)

| Ajout | Pourquoi | Statut | Priorité |
|---|---|---|---|
| **Paiement Jeko** (cartes, Wave, Orange Money, MTN MoMo, Moov Money, Djamo, QR PI-SPI) avec contrôle du montant | Votre choix de prestataire ; un webhook au mauvais montant ne valide rien | 🆕 | MVP |
| **Factures certifiées FNE** (DGI) | Obligatoire depuis janvier 2026 ; un PDF seul ne suffit pas | 🆕 file FNE · 🔨 API | MVP |
| **Loi ivoirienne 2013-450** à la place de « RGPD / CCPA » : déclaration et autorisation ARTCI | Le KYC biométrique et l'hébergement hors du pays exigent une autorisation préalable | 🔨 démarche | MVP (avant lancement) |
| **Notifications multicanal** (in-app, e-mail, SMS, WhatsApp, push) avec préférences | Le client choisit ; les alertes sécurité passent toujours | 🟢 · 🔨 API | MVP |
| **Pages référencées par ville et catégorie** (« location voiture Cocody », « SUV à vendre Abidjan ») | Première source de clients gratuits | 🔨 | MVP |
| **Bandeau de consentement cookies** (mesure d'audience seulement si accepté) | Loi 2013-450 | 🟢 `consents` · 🔨 | MVP |
| **Accessibilité WCAG 2.2 niveau AA** (contraste, taille des boutons, clavier) | Votre cahier cite les « normes d'accessibilité » : voici laquelle | 🔨 | MVP |
| **Sauvegarde nocturne chiffrée** de la base | L'offre Supabase gratuite n'a aucune sauvegarde | 🔨 `.github/workflows/sauvegarde-base.yml` | MVP |
| **Surveillance** : disponibilité, erreurs, alertes | Savoir avant le client | 🔨 `3-SECURITE/06` | MVP |
| **Application native** Android / iOS | Après validation du marché | 🔨 `1-FRONTEND/mobile` | P3 |
| **Traceur GPS** et coupure moteur à distance (partenariat) | Réponse au vol de véhicules loués sous fausse identité | 🔨 partenariat | P2 |
| **Inspection certifiée** des véhicules en vente (partenaire garage) | Rend le badge « Véhicule inspecté » vrai | 🟢 `certify_sale_listing` · 🔨 | P2 |

---

## 5. Corrections à apporter au cahier des charges

| Écrit dans les notes | À remplacer par |
|---|---|
| « RGPD / CCPA » | Loi ivoirienne n° 2013-450 + ARTCI (RGPD seulement si vous ciblez la diaspora en Europe) |
| « Responsabilité civile » comme option d'assurance | La RC est **obligatoire et incluse** ; les options sont les formules au-dessus |
| « Assurance multirisque incluse » (badge) | Seulement avec un contrat signé avec un assureur agréé |
| « Garantie 12 mois » (badge) | Seulement avec un contrat de garantie écrit remis à l'acheteur |
| « Téléchargement des factures » (PDF) | Factures **certifiées FNE** |
| « La caution fait l'objet d'une empreinte bancaire » | Caution **en agence** par défaut ; Mobile Money débité puis remboursé ; empreinte carte si Jeko la confirme |
| « Performance de chargement 2 secondes » | Objectifs Google mesurables : affichage principal < 2,5 s, réaction au toucher < 200 ms, stabilité < 0,1 |
| « HTTPS / SSL » | HTTPS partout + en-têtes de sécurité (HSTS, CSP…) — voir `3-SECURITE/04` |
