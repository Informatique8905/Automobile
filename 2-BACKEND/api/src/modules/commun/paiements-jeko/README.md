# Paiements Jeko

| Fichier | Rôle |
|---|---|
| `jeko.client.ts` | **Seul fichier qui parle à Jeko.** Créer un paiement, lire une transaction, rembourser, verser. Chemins et champs **à adapter** à la documentation remise par Jeko |
| `jeko-webhook.controller.ts` | `POST /webhooks/jeko` : signature HMAC sur le corps brut → journal `payment_events` → doublon ignoré → statut **redemandé à Jeko** → application |
| `application-paiement.service.ts` | Applique un résultat (succès / échec) dans la base — même logique pour le webhook et la réconciliation |
| `reconciliation.service.ts` | Toutes les 5 min : rattrape les paiements « en attente » (webhook perdu, Render endormi) |

## Les 5 protections

1. **Signature** vérifiée en temps constant, avec anti-rejeu par horodatage.
2. **Double vérification** : même signé, un webhook déclenche une lecture de la transaction chez Jeko.
3. **Montant et devise recontrôlés par la base** (`handle_jeko_payment_success`) : un écart crée un signal de fraude et ne valide rien.
4. **Idempotence** : un événement ou un paiement traité deux fois ne change rien.
5. **Plafond** : au-delà de 2 000 000 FCFA (à confirmer), la base refuse avant d'envoyer le client chez Jeko.

## Questions à poser à Jeko (réponses écrites)

1. Format exact de la signature des webhooks (en-tête, algorithme, horodatage signé ?)
2. Pré-autorisation carte (bloquer une caution sans débiter) : disponible ? durée ? capture partielle ?
3. Remboursements par API : délais, frais, Mobile Money et carte
4. Versements vers Mobile Money et banque par API ; versements fractionnés entre plusieurs partenaires
5. Plafond par transaction et par jour ; environnement de test (sandbox)
6. Statuts possibles d'une transaction et leur signification
7. Agrément : Jeko opère-t-il pour le compte d'un établissement agréé par la BCEAO ? Lequel ?
