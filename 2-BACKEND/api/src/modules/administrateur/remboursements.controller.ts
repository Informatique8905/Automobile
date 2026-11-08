/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTRÔLEUR · Administrateur · Remboursements
 * Route : /administrateur/remboursements
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • POST /administrateur/remboursements — crée une demande de remboursement
 *   • POST /administrateur/remboursements/:id/valider — 2ᵉ validation au-delà du seuil, puis ordre envoyé à Jeko
 *
 * DONNÉES
 *   • table refunds
 *   • JekoClient.rembourser (clé d'idempotence = id du remboursement)
 *   • rpc handle_refund_result
 *
 * SÉCURITÉ
 *   • Validation à deux personnes au-delà du seuil (le valideur ≠ le demandeur)
 *   • Audit de chaque étape
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Controller, NotImplementedException, Post } from '@nestjs/common';
import { Roles, UtilisateurCourant } from '../../noyau/auth/decorateurs';
import type { Utilisateur } from '../../noyau/auth/decorateurs';

@Roles('admin')
@Controller('administrateur/remboursements')
export class RemboursementsAdminController {
  /** POST /administrateur/remboursements — crée une demande de remboursement */
  @Post('')
  async demander(@UtilisateurCourant() _u: Utilisateur) {
    throw new NotImplementedException();
  }

  /** POST /administrateur/remboursements/:id/valider — 2ᵉ validation au-delà du seuil, puis ordre envoyé à Jeko */
  @Post(':id/valider')
  async valider(@UtilisateurCourant() _u: Utilisateur) {
    throw new NotImplementedException();
  }
}
