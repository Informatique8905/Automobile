/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTRÔLEUR · Vendeur · Photos d'état des lieux
 * Route : /vendeur/etats-des-lieux
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • POST /vendeur/etats-des-lieux/:reservation/photos — photo horodatée d'état des lieux (départ ou retour)
 *
 * DONNÉES
 *   • tables vehicle_inspections, inspection_photos
 *   • bucket privé inspection-photos
 *
 * SÉCURITÉ
 *   • Heure et position de prise de vue conservées côté serveur comme preuve
 *   • Photos visibles des deux parties et de l'équipe uniquement
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Controller, NotImplementedException, Post } from '@nestjs/common';
import { Roles, UtilisateurCourant } from '../../noyau/auth/decorateurs';
import type { Utilisateur } from '../../noyau/auth/decorateurs';

@Roles('partner')
@Controller('vendeur/etats-des-lieux')
export class EtatsDesLieuxVendeurController {
  /** POST /vendeur/etats-des-lieux/:reservation/photos — photo horodatée d'état des lieux (départ ou retour) */
  @Post(':reservation/photos')
  async envoyerPhoto(@UtilisateurCourant() _u: Utilisateur) {
    throw new NotImplementedException();
  }
}
