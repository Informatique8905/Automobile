# Module ADMINISTRATEUR — /administrateur/...

Actions de l'équipe qui touchent à l'argent, aux documents sensibles ou aux agents IA.

**Accès** : `@Roles('admin' | 'moderator' | 'support')` **+ session aal2** (RolesGuard) — et la base exige aal2 elle aussi

| Fichier | Rôle | Routes |
|---|---|---|
| `agents-ia.controller.ts` | Administrateur · Agents IA | `POST /administrateur/agents-ia/:type/tester`<br>`POST /administrateur/agents-ia/taches/:id/rejouer` |
| `documents.controller.ts` | Administrateur · Consultation des documents sensibles | `GET /administrateur/documents/:id/lien` |
| `incidents.controller.ts` | Administrateur · Violations de données | `POST /administrateur/incidents/:id/notifier-personnes` |
| `mes-donnees.controller.ts` | Administrateur · Demandes « vie privée » | `POST /administrateur/mes-donnees/:id/export` |
| `remboursements.controller.ts` | Administrateur · Remboursements | `POST /administrateur/remboursements`<br>`POST /administrateur/remboursements/:id/valider` |
| `versements.controller.ts` | Administrateur · Versements aux partenaires | `POST /administrateur/versements/lot` |
