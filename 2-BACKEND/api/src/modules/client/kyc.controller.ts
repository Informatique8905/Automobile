/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTRÔLEUR · Client · Vérification d'identité
 * Route : /client/kyc
 * ═══════════════════════════════════════════════════════════════════════════
 * CAHIER DES CHARGES
 *   Tunnel — b) Conducteur et vérification d'identité (KYC)
 *
 * CONTENU
 *   • POST /client/kyc/session — ouvre une session chez le fournisseur KYC (pièce + permis + selfie)
 *   • GET /client/kyc/statut — statut de vérification du client
 *
 * DONNÉES
 *   • table kyc_verifications (création avec le jeton du client)
 *   • table consents : biometric_processing exigé avant la session
 *
 * SÉCURITÉ
 *   • Limite : 3 sessions / 24 h (LIMITES.sessionKyc) — chaque session coûte
 *   • Résultat reçu par webhook signé (commun/kyc), jamais par le navigateur
 *   • La décision finale reste humaine (decide_kyc)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Controller, NotImplementedException, Get, Post } from '@nestjs/common';
import { Roles, UtilisateurCourant } from '../../noyau/auth/decorateurs';
import type { Utilisateur } from '../../noyau/auth/decorateurs';

@Roles('client')
@Controller('client/kyc')
export class KycClientController {
  /** POST /client/kyc/session — ouvre une session chez le fournisseur KYC (pièce + permis + selfie) */
  @Post('session')
  async creerSession(@UtilisateurCourant() _u: Utilisateur) {
    throw new NotImplementedException();
  }

  /** GET /client/kyc/statut — statut de vérification du client */
  @Get('statut')
  async statut(@UtilisateurCourant() _u: Utilisateur) {
    throw new NotImplementedException();
  }
}
