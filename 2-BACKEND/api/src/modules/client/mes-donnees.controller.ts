/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTRÔLEUR · Client · Mes données (loi 2013-450)
 * Route : /client/mes-donnees
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • GET /client/mes-donnees/export/:demande — URL signée de l'archive préparée par l'équipe
 *
 * DONNÉES
 *   • table privacy_requests (export_path)
 *
 * SÉCURITÉ
 *   • Limite : 2 / 24 h
 *   • Archive chiffrée, lien valable 24 h
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Controller, NotImplementedException, Get } from '@nestjs/common';
import { Roles, UtilisateurCourant } from '../../noyau/auth/decorateurs';
import type { Utilisateur } from '../../noyau/auth/decorateurs';

@Roles('client')
@Controller('client/mes-donnees')
export class MesDonneesClientController {
  /** GET /client/mes-donnees/export/:demande — URL signée de l'archive préparée par l'équipe */
  @Get('export/:demande')
  async telechargerExport(@UtilisateurCourant() _u: Utilisateur) {
    throw new NotImplementedException();
  }
}
