/**
 * MODULE ADMINISTRATEUR — routes /administrateur/...
 * Rôles de l'équipe uniquement, session « aal2 » (double authentification) exigée
 * par RolesGuard ET par la base.
 */
import { Module } from '@nestjs/common';
import { CommunModule } from '../commun/commun.module';
import { RemboursementsAdminController } from './remboursements.controller';
import { VersementsAdminController } from './versements.controller';
import { DocumentsAdminController } from './documents.controller';
import { AgentsIaAdminController } from './agents-ia.controller';
import { MesDonneesAdminController } from './mes-donnees.controller';
import { IncidentsAdminController } from './incidents.controller';

@Module({
  imports: [CommunModule],
  controllers: [
    RemboursementsAdminController,
    VersementsAdminController,
    DocumentsAdminController,
    AgentsIaAdminController,
    MesDonneesAdminController,
    IncidentsAdminController,
  ],
})
export class AdministrateurModule {}
