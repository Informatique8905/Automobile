/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTRÔLEUR · Vendeur · Comptes de versement
 * Route : /vendeur/versements
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • POST /vendeur/versements/comptes — ajoute un compte Mobile Money / bancaire (chiffré)
 *   • Chiffre le numéro (ChiffrementService), insère avec le jeton du partenaire (la RLS exige owner / manager)
 *
 * SÉCURITÉ
 *   • Délai de carence de 72 h, alerte e-mail et contrôle IA appliqués par la base
 *   • Le numéro en clair ne transite que dans cette requête
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Controller, NotImplementedException, Post } from '@nestjs/common';
import { Roles, UtilisateurCourant } from '../../noyau/auth/decorateurs';
import type { Utilisateur } from '../../noyau/auth/decorateurs';

@Roles('partner')
@Controller('vendeur/versements')
export class VersementsVendeurController {
  /** POST /vendeur/versements/comptes — ajoute un compte Mobile Money / bancaire (chiffré) */
  @Post('comptes')
  async ajouterCompte(@UtilisateurCourant() _u: Utilisateur) {
    throw new NotImplementedException();
  }
}
