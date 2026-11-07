# Plan de réponse aux incidents

**Règle n° 1 : contenir d'abord, comprendre ensuite.** Chaque incident est inscrit dans le back-office
(Incidents → `data_incidents`) dès sa détection, avec l'heure.

| Gravité | Exemples | Délai de réaction |
|---|---|---|
| 1 – Critique | Fuite de la clé secrète, compte admin piraté, fuite de pièces d'identité | Immédiat, 24 h/24 |
| 2 – Élevée | Fraude au paiement en cours, véhicule non restitué | < 2 h |
| 3 – Moyenne | Vague d'annonces frauduleuses, attaque de mots de passe | < 24 h |

---

## A. Clé secrète Supabase (ou Jeko, ou IA) exposée
1. Supabase → Paramètres API → **révoquer** la clé et en créer une nouvelle (ou équivalent chez Jeko / fournisseur IA).
2. Mettre la nouvelle valeur sur Render, redéployer l'API.
3. Chercher dans `audit_logs` et les journaux Supabase les actions faites avec l'ancienne clé depuis la fuite.
4. Retirer la clé de l'historique Git si elle y est (et considérer qu'elle est publique quoi qu'il arrive).
5. Inscrire l'incident ; si des données ont été lues → procédure D.

## B. Compte de l'équipe piraté
1. Retirer immédiatement le rôle dans `user_roles` (un autre admin) et déconnecter toutes ses sessions.
2. Lister ses actions dans `audit_logs` depuis la dernière connexion légitime ; annuler ce qui doit l'être.
3. Réinitialiser mot de passe + facteur TOTP ; vérifier la messagerie de la personne (hameçonnage ?).
4. Vérifier les versements et remboursements récents.

## C. Fraude au paiement / véhicule non restitué
1. Suspendre le compte client (`user_sanctions`), bloquer pièce et téléphone (`blocklist`, valeurs hachées).
2. Paiement : vérifier chez Jeko (transaction réelle ?), geler les versements du partenaire concerné si besoin.
3. Véhicule : fournir au partenaire le dossier (KYC, contrat, QR de remise, état des lieux, traceur) pour la plainte
   (police / Plateforme de lutte contre la cybercriminalité).
4. Ajouter le cas aux exemples d'évaluation des agents IA.

## D. Violation de données personnelles
1. Contenir (révoquer accès, fermer la faille), évaluer : quelles données, combien de personnes, quel risque.
2. Remplir l'incident : catégories de données, nombre de personnes, mesures.
3. **Notifier l'ARTCI** et, si le risque est élevé, les personnes concernées (délais et forme à confirmer avec l'avocat).
4. Renseigner `artci_notified_at` et `users_notified_at`.
5. Retour d'expérience sous 7 jours : cause, correction, test ajouté.

## Contacts (à compléter)
| Rôle | Nom | Téléphone |
|---|---|---|
| Responsable sécurité | | |
| Administrateur n° 2 | | |
| Avocat (données personnelles) | | |
| Jeko — support marchand | | |
| Assureur | | |
