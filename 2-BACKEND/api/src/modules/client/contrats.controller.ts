/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTRÔLEUR · Client · Contrat de location
 * Route : /client/contrats
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • GET /client/contrats/:reservation — URL signée du contrat PDF (généré à la confirmation)
 *
 * DONNÉES
 *   • table contracts
 *   • bucket privé contracts
 *
 * SÉCURITÉ
 *   • Lecture avec le jeton du client : la RLS vérifie que c'est SA réservation
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Controller, NotImplementedException, Get } from '@nestjs/common';
import { Roles, UtilisateurCourant } from '../../noyau/auth/decorateurs';
import type { Utilisateur } from '../../noyau/auth/decorateurs';

@Roles('client')
@Controller('client/contrats')
export class ContratsClientController {
  /** GET /client/contrats/:reservation — URL signée du contrat PDF (généré à la confirmation) */
  @Get(':reservation')
  async telecharger(@UtilisateurCourant() _u: Utilisateur) {
    throw new NotImplementedException();
  }
}
