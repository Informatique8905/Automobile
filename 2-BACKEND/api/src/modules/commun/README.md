# Module COMMUN — intégrations partagées

Un dossier par prestataire ou par technique : changer de prestataire ne touche qu'un dossier.

**Accès** : Clés des prestataires lues dans `env`, jamais journalisées

| Fichier | Rôle | Routes |
|---|---|---|
| `chiffrement/chiffrement.service.ts` | CHIFFREMENT APPLICATIF — numéros de compte de versement (Mobile Money, banque) | — |
| `contrats-pdf/generateur-contrat.service.ts` | Génération du contrat de location (PDF) | — |
| `factures-fne/certification-fne.service.ts` | CERTIFICATION DES FACTURES (FNE — Direction générale des impôts) | — |
| `factures-fne/fne.client.ts` | CLIENT DE LA PLATEFORME FNE (DGI Côte d'Ivoire) | — |
| `ia/agents-ia.service.ts` | PONT ENTRE L'API ET LES AGENTS IA (code dans 3-SECURITE/05-agents-ia) | — |
| `images/traitement-images.service.ts` | Traitement des images | — |
| `kyc/fournisseur-kyc.service.ts` | Fournisseur de vérification d'identité | — |
| `kyc/kyc-webhook.controller.ts` | Webhook du fournisseur KYC | `POST /webhooks/kyc` |
| `notifications/envoi-notifications.service.ts` | ENVOI DES NOTIFICATIONS (e-mail, SMS, WhatsApp, push) | — |
| `notifications/canaux/email.ts` | Canal email | — |
| `notifications/canaux/push.ts` | Canal push | — |
| `notifications/canaux/sms.ts` | Canal sms | — |
| `notifications/canaux/whatsapp.ts` | Canal whatsapp | — |
| `paiements-jeko/application-paiement.service.ts` | APPLIQUER LE RÉSULTAT D'UNE TRANSACTION JEKO DANS LA BASE | — |
| `paiements-jeko/jeko-webhook.controller.ts` | WEBHOOK JEKO — POST /webhooks/jeko | `POST /webhooks/jeko` |
| `paiements-jeko/jeko.client.ts` | CLIENT JEKO — seul endroit du projet qui parle à l'API de paiement | — |
| `paiements-jeko/reconciliation.service.ts` | RÉCONCILIATION DES PAIEMENTS — toutes les 5 minutes (tâches internes) | — |
