/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTRÔLEUR · Administrateur · Agents IA
 * Route : /administrateur/agents-ia
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • POST /administrateur/agents-ia/:type/tester — exécute un agent sur un exemple sans effet (bac à sable)
 *   • POST /administrateur/agents-ia/taches/:id/rejouer — remet une tâche en file (après correction d'un prompt)
 *
 * DONNÉES
 *   • table ai_agents (réglages faits directement depuis le back-office, sous RLS)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Controller, NotImplementedException, Post } from '@nestjs/common';
import { Roles, UtilisateurCourant } from '../../noyau/auth/decorateurs';
import type { Utilisateur } from '../../noyau/auth/decorateurs';

@Roles('admin')
@Controller('administrateur/agents-ia')
export class AgentsIaAdminController {
  /** POST /administrateur/agents-ia/:type/tester — exécute un agent sur un exemple sans effet (bac à sable) */
  @Post(':type/tester')
  async tester(@UtilisateurCourant() _u: Utilisateur) {
    throw new NotImplementedException();
  }

  /** POST /administrateur/agents-ia/taches/:id/rejouer — remet une tâche en file (après correction d'un prompt) */
  @Post('taches/:id/rejouer')
  async rejouer(@UtilisateurCourant() _u: Utilisateur) {
    throw new NotImplementedException();
  }
}
