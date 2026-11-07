/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTRÔLEUR · Client · Coffre-fort de documents
 * Route : /client/documents
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • POST /client/documents/lien-envoi — URL signée d'envoi vers le bucket privé kyc-documents
 *   • GET /client/documents/:id/lien — URL signée de lecture (5 min) d'un de SES documents
 *
 * DONNÉES
 *   • table user_documents
 *   • bucket privé kyc-documents : chemin {user_id}/{uuid}
 *
 * SÉCURITÉ
 *   • Chemin imposé par le serveur (pas choisi par le navigateur)
 *   • Type et taille revérifiés (controlerFichier) avant validation
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Controller, NotImplementedException, Get, Post } from '@nestjs/common';
import { Roles, UtilisateurCourant } from '../../noyau/auth/decorateurs';
import type { Utilisateur } from '../../noyau/auth/decorateurs';

@Roles('client')
@Controller('client/documents')
export class DocumentsClientController {
  /** POST /client/documents/lien-envoi — URL signée d'envoi vers le bucket privé kyc-documents */
  @Post('lien-envoi')
  async lienEnvoi(@UtilisateurCourant() _u: Utilisateur) {
    throw new NotImplementedException();
  }

  /** GET /client/documents/:id/lien — URL signée de lecture (5 min) d'un de SES documents */
  @Get(':id/lien')
  async lienLecture(@UtilisateurCourant() _u: Utilisateur) {
    throw new NotImplementedException();
  }
}
