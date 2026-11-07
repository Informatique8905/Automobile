import { Module } from "@nestjs/common";
import { PaiementsController } from "./paiements.controller.js";
import { KycController } from "./kyc.controller.js";
import { ContratsController } from "./contrats.controller.js";
import { DocumentsController } from "./documents.controller.js";
import { FacturesController } from "./factures.controller.js";
import { MesDonneesController } from "./mes-donnees.controller.js";
@Module({ controllers: [PaiementsController, KycController, ContratsController, DocumentsController, FacturesController, MesDonneesController] }) export class ClientModule {}
