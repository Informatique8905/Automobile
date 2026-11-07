import { Module } from "@nestjs/common";
import { TachesController } from "./taches.controller.js";
import { OrchestrateurService } from "./orchestrateur.service.js";
@Module({ controllers: [TachesController], providers: [OrchestrateurService] }) export class TachesModule {}
