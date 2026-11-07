/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTRÔLEUR · Client · Factures certifiées
 * Route : /client/factures
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • GET /client/factures/:id — URL signée de la facture PDF — seulement si fne_status = certified
 *
 * DONNÉES
 *   • table invoices
 *   • bucket privé invoices
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Controller, NotImplementedException, Get } from '@nestjs/common';
import { Roles, UtilisateurCourant } from '../../noyau/auth/decorateurs';
import type { Utilisateur } from '../../noyau/auth/decorateurs';

@Roles('client')
@Controller('client/factures')
export class FacturesClientController {
  /** GET /client/factures/:id — URL signée de la facture PDF — seulement si fne_status = certified */
  @Get(':id')
  async telecharger(@UtilisateurCourant() _u: Utilisateur) {
    throw new NotImplementedException();
  }
}
