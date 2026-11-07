# Checklist — avant le lancement public

## Comptes et hébergement
- [ ] Vercel Pro, Render Starter, Supabase Pro activés
- [ ] Domaines www / pro / admin / api en HTTPS ; HSTS actif
- [ ] Sauvegarde nocturne testée : **restauration réussie** sur une base vide
- [ ] Surveillance de disponibilité et Sentry branchés

## Identité et accès
- [ ] 2 administrateurs maximum, double authentification activée et testée
- [ ] Session du back-office limitée à 8 h
- [ ] CAPTCHA activé sur l'inscription et la connexion
- [ ] Connexion par téléphone : fournisseur SMS configuré, nom d'expéditeur enregistré

## Paiement (Jeko)
- [ ] Contrat signé ; réponses écrites : pré-autorisation, remboursements, versements fractionnés, plafond
- [ ] Secret de webhook en place ; test de signature invalide → refusé
- [ ] Réconciliation active ; test « webhook perdu » → paiement rattrapé
- [ ] Test de bout en bout avec chaque moyen : Wave, Orange Money, MTN MoMo, Moov Money, carte

## Données et conformité
- [ ] Déclaration ARTCI déposée ; autorisations obtenues (KYC biométrique, transferts)
- [ ] Conditions générales, politique de confidentialité, mentions légales publiées (`legal_documents`)
- [ ] Bandeau cookies : aucune mesure d'audience avant consentement
- [ ] Factures FNE : 1 facture certifiée de test
- [ ] Contrat assureur signé pour la formule incluse ; badges « assurance » et « garantie » justifiés

## Sécurité
- [ ] `test-db.sh` vert dans les deux modes
- [ ] Aucun avertissement du conseiller de sécurité Supabase
- [ ] Test d'intrusion réalisé, failles critiques corrigées
- [ ] Agents IA : modération en `auto`, agents de sécurité en `shadow` depuis 2 semaines, budgets fixés
- [ ] Plan de réponse aux incidents : contacts remplis, procédure A répétée une fois
