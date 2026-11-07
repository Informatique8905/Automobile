import { Module } from "@nestjs/common";
import { AgentsIaController } from "./agents-ia.controller.js";
import { DocumentsController } from "./documents.controller.js";
import { IncidentsController } from "./incidents.controller.js";
import { MesDonneesController } from "./mes-donnees.controller.js";
import { RemboursementsController } from "./remboursements.controller.js";
import { VersementsController } from "./versements.controller.js";
@Module({ controllers: [AgentsIaController, DocumentsController, IncidentsController, MesDonneesController, RemboursementsController, VersementsController] }) export class AdministrateurModule {}
