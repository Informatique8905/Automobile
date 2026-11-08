/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTRÔLEUR · Administrateur · Versements aux partenaires
 * Route : /administrateur/versements
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • POST /administrateur/versements/lot — calcule et envoie les versements de la période via Jeko
 *
 * DONNÉES
 *   • tables payouts, payout_items, partner_payout_accounts
 *   • ChiffrementService.dechiffrer (en mémoire uniquement)
 *
 * SÉCURITÉ
 *   • Refus automatique vers un compte en période de carence
 *   • Idempotence : référence du versement envoyée à Jeko
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Controller, NotImplementedException, Post } from '@nestjs/common';
import { Roles, UtilisateurCourant } from '../../noyau/auth/decorateurs';
import type { Utilisateur } from '../../noyau/auth/decorateurs';

@Roles('admin')
@Controller('administrateur/versements')
export class VersementsAdminController {
  /** POST /administrateur/versements/lot — calcule et envoie les versements de la période via Jeko */
  @Post('lot')
  async lancerLot(@UtilisateurCourant() _u: Utilisateur) {
    throw new NotImplementedException();
  }
}
