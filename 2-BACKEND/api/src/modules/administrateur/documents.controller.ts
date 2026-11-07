/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTRÔLEUR · Administrateur · Consultation des documents sensibles
 * Route : /administrateur/documents
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • GET /administrateur/documents/:id/lien — URL signée de 5 minutes vers une pièce d'identité / un permis
 *
 * SÉCURITÉ
 *   • Chaque consultation écrite dans audit_logs (qui, quoi, quand)
 *   • Motif de consultation obligatoire
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Controller, NotImplementedException, Get } from '@nestjs/common';
import { Roles, UtilisateurCourant } from '../../noyau/auth/decorateurs';
import type { Utilisateur } from '../../noyau/auth/decorateurs';

@Roles('moderator', 'admin')
@Controller('administrateur/documents')
export class DocumentsAdminController {
  /** GET /administrateur/documents/:id/lien — URL signée de 5 minutes vers une pièce d'identité / un permis */
  @Get(':id/lien')
  async lien(@UtilisateurCourant() _u: Utilisateur) {
    throw new NotImplementedException();
  }
}
