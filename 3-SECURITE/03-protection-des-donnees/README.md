# 03 — Protection des données personnelles

> Informations à valider par un avocat ivoirien avant le lancement.

## 1. Le cadre : loi n° 2013-450 et ARTCI (pas le RGPD)

| Obligation | Pour la plateforme | Statut |
|---|---|---|
| Déclarer les traitements à l'ARTCI | Comptes, réservations, paiements, messagerie | 🔨 démarche |
| **Autorisation préalable** de l'ARTCI | Pièces d'identité et permis, **selfie / biométrie** (KYC), **hébergement hors du pays** (Supabase Europe), prestataire IA à l'étranger | 🔨 démarche — le silence de l'ARTCI vaut refus |
| Consentement prouvé | Conditions, confidentialité, marketing, cookies, biométrie | ✅ table `consents` |
| Droits des personnes | Accès, rectification, opposition, suppression | ✅ `privacy_requests`, `account_deletion_requests` |
| Sécurité des données | Mesures techniques et organisationnelles | ✅ ce dossier |
| Violation de données | Registre + notification | ✅ `data_incidents` + `07-reponse-aux-incidents` |

Le RGPD ne s'applique que si vous ciblez volontairement des personnes situées dans l'Union européenne
(ex. campagne vers la diaspora). Le CCPA (Californie) est sans objet.

## 2. Classer les données

| Niveau | Exemples | Où | Protection |
|---|---|---|---|
| **Public** | Annonces publiées, photos de véhicules, nom d'agence, notes | Tables publiques, bucket `vehicle-photos` | Lecture libre, écriture contrôlée |
| **Interne** | Réservations, messages, factures | Tables avec RLS | Visible des seules parties concernées |
| **Confidentiel** | Téléphone, e-mail, adresse, RCCM, compte de versement | `profiles`, `partner_private` | RLS stricte, compte de versement **chiffré** (`account_ciphertext`) |
| **Très sensible** | Pièce d'identité, permis, selfie, numéro de document | Bucket privé `kyc-documents` | Lien signé ≤ 5 min, accès de l'équipe journalisé, numéro de document **haché** pour la liste noire, jamais envoyé à l'IA |

## 3. Chiffrement

| Où | Comment |
|---|---|
| En transit | HTTPS partout (HSTS 2 ans) |
| Au repos | Chiffrement disque Supabase (AES-256) |
| Données de versement | Chiffrement applicatif par l'API (`PAYOUT_ENCRYPTION_KEY`, AES-256-GCM) avant écriture ; la base ne voit que le texte chiffré et les 4 derniers caractères |
| Liste noire | Empreinte SHA-256 d'une valeur normalisée : on bloque sans stocker |
| Sauvegardes | Chiffrées (GPG AES-256) avant de quitter Supabase |

## 4. Durées de conservation (proposition à valider)

| Donnée | Durée | Ensuite |
|---|---|---|
| Compte inactif | 3 ans sans connexion | Avertissement puis anonymisation |
| Pièces KYC | Durée de la relation + 1 an | Suppression du fichier |
| Selfie de vérification | 30 jours après la décision | Suppression |
| Réservations, factures, paiements | 10 ans (obligations comptables et contrats électroniques) | Archivage |
| Messages | 2 ans après la dernière réservation | Suppression |
| Journal de sécurité | 1 an | Suppression |
| Journal d'audit | 5 ans | Purge par `private.purge_audit_logs` |
| Décisions des agents IA | 1 an (sans donnée brute : empreinte seulement) | Suppression |

## 5. Transferts hors de Côte d'Ivoire

| Destinataire | Pays | Données | Base |
|---|---|---|---|
| Supabase (base, fichiers) | Union européenne | Toutes | Autorisation ARTCI |
| Vercel (pages) | Mondial (CDN) | Pages publiques, jamais de documents | — |
| Render (API) | Union européenne (Francfort) | Données en transit | Autorisation ARTCI |
| Fournisseur KYC | Selon contrat | Pièces, selfie | Autorisation ARTCI + contrat |
| Fournisseur IA | Selon contrat | Textes **masqués**, photos publiques | Autorisation ARTCI + contrat sans réutilisation des données |

Voir `REGISTRE_DES_TRAITEMENTS.md` pour la fiche de chaque traitement.
