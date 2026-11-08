# 06 — Surveillance et alertes

## Ce qu'on surveille

| Quoi | Outil (offre gratuite au départ) | Alerte si |
|---|---|---|
| Disponibilité des 4 adresses (www, pro, admin, api/sante) | Surveillance de disponibilité externe (ex. UptimeRobot, Better Stack) | Indisponible 2 min |
| Erreurs frontend et API | Sentry | Nouvelle erreur, pic d'erreurs |
| Journaux API | Journaux Render (7 jours) → flux vers un service de journaux si besoin | Mot-clé `SIGNATURE_INVALIDE`, `AMOUNT_MISMATCH` |
| Base | Tableau de bord Supabase + conseiller de sécurité (« Security Advisor ») | Table sans RLS, index manquant, espace > 80 % |
| Sécurité métier | Synthèse IA quotidienne (`05-agents-ia/src/synthese.ts`) | Événements graves, écarts de montant |
| Paiements | Réconciliation Jeko toutes les 5 min | Paiement « en attente » > 30 min |
| Tâches de fond | `ai_jobs` en échec, `invoices.fne_status = 'failed'` | > 10 en échec |

## Règles des journaux

- **Jamais** de mot de passe, de jeton, de numéro de carte, de numéro de document ni de texte de message dans les journaux.
- Chaque requête API porte un identifiant de corrélation (`x-request-id`) repris dans les journaux.
- Les adresses IP sont hachées avant stockage dans `security_events`.

## Tableau de bord sécurité (back-office → Sécurité)

1. Signaux de fraude des dernières 24 h, par type
2. Connexions suspectes et comptes bloqués
3. Signalements en attente et délai moyen de traitement
4. Décisions des agents IA (pass / flag / block, erreurs, coût du jour)
5. Paiements : écarts de montant, échecs répétés, remboursements
6. Comptes de versement ajoutés (en période de carence)
