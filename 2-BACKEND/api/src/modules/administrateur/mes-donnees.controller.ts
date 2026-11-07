/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTRÔLEUR · Administrateur · Demandes « vie privée »
 * Route : /administrateur/mes-donnees
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • POST /administrateur/mes-donnees/:id/export — génère l'archive des données d'un utilisateur (JSON + fichiers)
 *
 * DONNÉES
 *   • table privacy_requests
 *
 * SÉCURITÉ
 *   • Archive chiffrée dans un bucket privé, lien de 24 h
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Controller, NotImplementedException, Post } from '@nestjs/common';
import { Roles, UtilisateurCourant } from '../../noyau/auth/decorateurs';
import type { Utilisateur } from '../../noyau/auth/decorateurs';

@Roles('admin', 'support')
@Controller('administrateur/mes-donnees')
export class MesDonneesAdminController {
  /** POST /administrateur/mes-donnees/:id/export — génère l'archive des données d'un utilisateur (JSON + fichiers) */
  @Post(':id/export')
  async preparerExport(@UtilisateurCourant() _u: Utilisateur) {
    throw new NotImplementedException();
  }
}
