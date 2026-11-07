/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTRÔLEUR · Webhook du fournisseur KYC
 * Route : /webhooks/kyc
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • POST /webhooks/kyc — résultat de vérification signé par le fournisseur
 *
 * SÉCURITÉ
 *   • @Public mais signature HMAC obligatoire (verifierSignatureHmac, KYC_WEBHOOK_SECRET)
 *   • Enregistre un pré-avis : la décision reste humaine
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Controller, NotImplementedException, Post } from '@nestjs/common';
import { Public } from '../../../noyau/auth/decorateurs';

@Controller('webhooks/kyc')
export class KycWebhookController {
  /** POST /webhooks/kyc — résultat de vérification signé par le fournisseur */
  @Public()
  @Post('')
  async recevoir() {
    throw new NotImplementedException();
  }
}
