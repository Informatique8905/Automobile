/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTRÔLEUR · Administrateur · Violations de données
 * Route : /administrateur/incidents
 * ═══════════════════════════════════════════════════════════════════════════
 * Voir 3-SECURITE/07-reponse-aux-incidents/PLAN_DE_REPONSE.md
 *
 * CONTENU
 *   • POST /administrateur/incidents/:id/notifier-personnes — informe les personnes concernées par e-mail / SMS
 *
 * DONNÉES
 *   • table data_incidents (users_notified_at)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Controller, NotImplementedException, Post } from '@nestjs/common';
import { Roles, UtilisateurCourant } from '../../noyau/auth/decorateurs';
import type { Utilisateur } from '../../noyau/auth/decorateurs';

@Roles('admin')
@Controller('administrateur/incidents')
export class IncidentsAdminController {
  /** POST /administrateur/incidents/:id/notifier-personnes — informe les personnes concernées par e-mail / SMS */
  @Post(':id/notifier-personnes')
  async notifierPersonnes(@UtilisateurCourant() _u: Utilisateur) {
    throw new NotImplementedException();
  }
}
