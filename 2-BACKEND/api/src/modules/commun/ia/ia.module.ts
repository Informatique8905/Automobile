import { Module } from "@nestjs/common";
import { AgentsIaService } from "./agents-ia.service.js";
@Module({ providers: [AgentsIaService], exports: [AgentsIaService] }) export class IaModule {}
