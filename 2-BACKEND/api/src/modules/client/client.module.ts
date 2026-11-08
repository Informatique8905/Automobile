/**
 * MODULE CLIENT — routes /client/... (rôle « client », jeton obligatoire)
 */
import { Module } from '@nestjs/common';
import { CommunModule } from '../commun/commun.module';
import { PaiementsClientController } from './paiements.controller';
import { KycClientController } from './kyc.controller';
import { DocumentsClientController } from './documents.controller';
import { ContratsClientController } from './contrats.controller';
import { FacturesClientController } from './factures.controller';
import { MesDonneesClientController } from './mes-donnees.controller';

@Module({
  imports: [CommunModule],
  controllers: [
    PaiementsClientController,
    KycClientController,
    DocumentsClientController,
    ContratsClientController,
    FacturesClientController,
    MesDonneesClientController,
  ],
})
export class ClientModule {}
