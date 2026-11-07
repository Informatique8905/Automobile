/**
 * MODULE COMMUN — intégrations partagées par client, vendeur et administrateur.
 * Chaque prestataire externe a son dossier : le changer ne touche qu'un dossier.
 */
import { Module } from '@nestjs/common';
import { PaiementsJekoModule } from './paiements-jeko/paiements-jeko.module';
import { CertificationFneService } from './factures-fne/certification-fne.service';
import { FneClient } from './factures-fne/fne.client';
import { EnvoiNotificationsService } from './notifications/envoi-notifications.service';
import { AgentsIaService } from './ia/agents-ia.service';
import { ChiffrementService } from './chiffrement/chiffrement.service';
import { TraitementImagesService } from './images/traitement-images.service';
import { GenerateurContratService } from './contrats-pdf/generateur-contrat.service';
import { FournisseurKycService } from './kyc/fournisseur-kyc.service';
import { KycWebhookController } from './kyc/kyc-webhook.controller';

const services = [
  CertificationFneService,
  FneClient,
  EnvoiNotificationsService,
  AgentsIaService,
  ChiffrementService,
  TraitementImagesService,
  GenerateurContratService,
  FournisseurKycService,
];

@Module({
  imports: [PaiementsJekoModule],
  controllers: [KycWebhookController],
  providers: services,
  exports: [PaiementsJekoModule, ...services],
})
export class CommunModule {}
