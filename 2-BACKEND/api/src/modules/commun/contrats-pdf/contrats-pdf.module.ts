import { Module } from "@nestjs/common";
import { GenerateurContratService } from "./generateur-contrat.service.js";
@Module({ providers: [GenerateurContratService], exports: [GenerateurContratService] }) export class ContratsPdfModule {}
