/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTRÔLEUR · Vendeur · Exports comptables
 * Route : /vendeur/exports
 * ═══════════════════════════════════════════════════════════════════════════
 * AJOUT (P2)
 *
 * CONTENU
 *   • GET /vendeur/exports/releve — CSV : réservations, commissions, versements sur une période
 *
 * SÉCURITÉ
 *   • Données lues avec le jeton du partenaire : seulement son agence
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Controller, NotImplementedException, Get } from '@nestjs/common';
import { Roles, UtilisateurCourant } from '../../noyau/auth/decorateurs';
import type { Utilisateur } from '../../noyau/auth/decorateurs';

@Roles('partner')
@Controller('vendeur/exports')
export class ExportsVendeurController {
  /** GET /vendeur/exports/releve — CSV : réservations, commissions, versements sur une période */
  @Get('releve')
  async releve(@UtilisateurCourant() _u: Utilisateur) {
    throw new NotImplementedException();
  }
}
