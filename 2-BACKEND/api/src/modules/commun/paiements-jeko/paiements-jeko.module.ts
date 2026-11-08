import { Module } from '@nestjs/common';
import { env } from '../../../noyau/config/env';
import { JekoClient } from './jeko.client';
import { PaiementSimulationService } from './paiement-simulation.service';
import { PaiementSimulationController } from './paiement-simulation.controller';
import { JekoWebhookController } from './jeko-webhook.controller';
import { ApplicationPaiementService } from './application-paiement.service';
import { ReconciliationService } from './reconciliation.service';
import { FOURNISSEUR_PAIEMENT, type FournisseurPaiement } from './fournisseur-paiement';

@Module({
  controllers: [JekoWebhookController, PaiementSimulationController],
  providers: [
    JekoClient,
    PaiementSimulationService,
    ApplicationPaiementService,
    ReconciliationService,
    {
      provide: FOURNISSEUR_PAIEMENT,
      useFactory: (jeko: JekoClient, simulation: PaiementSimulationService): FournisseurPaiement =>
        env.PAIEMENT_MODE === 'jeko' ? jeko : simulation,
      inject: [JekoClient, PaiementSimulationService],
    },
  ],
  exports: [FOURNISSEUR_PAIEMENT, ReconciliationService],
})
export class PaiementsJekoModule {}
