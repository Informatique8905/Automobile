/**
 * MODULE VENDEUR — routes /vendeur/... (rôle « partner », jeton obligatoire)
 * L'appartenance à l'agence et le rôle (owner / manager / agent) sont revérifiés
 * par la base : l'API appelle Supabase avec le jeton du partenaire.
 */
import { Module } from '@nestjs/common';
import { CommunModule } from '../commun/commun.module';
import { PhotosVendeurController } from './photos.controller';
import { EtatsDesLieuxVendeurController } from './etats-des-lieux.controller';
import { VersementsVendeurController } from './versements.controller';
import { EquipeVendeurController } from './equipe.controller';
import { ExportsVendeurController } from './exports.controller';

@Module({
  imports: [CommunModule],
  controllers: [
    PhotosVendeurController,
    EtatsDesLieuxVendeurController,
    VersementsVendeurController,
    EquipeVendeurController,
    ExportsVendeurController,
  ],
})
export class VendeurModule {}
