import { Module } from '@nestjs/common';
import { JekoClient } from './jeko.client';
import { JekoWebhookController } from './jeko-webhook.controller';
import { ApplicationPaiementService } from './application-paiement.service';
import { ReconciliationService } from './reconciliation.service';

@Module({
  controllers: [JekoWebhookController],
  providers: [JekoClient, ApplicationPaiementService, ReconciliationService],
  exports: [JekoClient, ReconciliationService],
})
export class PaiementsJekoModule {}
