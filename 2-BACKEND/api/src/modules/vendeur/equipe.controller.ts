/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTRÔLEUR · Vendeur · Invitations d'équipe
 * Route : /vendeur/equipe
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • POST /vendeur/equipe/invitations/:id/envoyer — envoie l'e-mail d'invitation créé par invite_partner_member
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Controller, NotImplementedException, Post } from '@nestjs/common';
import { Roles, UtilisateurCourant } from '../../noyau/auth/decorateurs';
import type { Utilisateur } from '../../noyau/auth/decorateurs';

@Roles('partner')
@Controller('vendeur/equipe')
export class EquipeVendeurController {
  /** POST /vendeur/equipe/invitations/:id/envoyer — envoie l'e-mail d'invitation créé par invite_partner_member */
  @Post('invitations/:id/envoyer')
  async envoyerInvitation(@UtilisateurCourant() _u: Utilisateur) {
    throw new NotImplementedException();
  }
}
