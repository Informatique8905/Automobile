import { Module } from "@nestjs/common";
import { JekoClient } from "./jeko.client.js";
import { JekoWebhookController } from "./jeko-webhook.controller.js";
import { ApplicationPaiementService } from "./application-paiement.service.js";
import { ReconciliationService } from "./reconciliation.service.js";
@Module({ controllers: [JekoWebhookController], providers: [JekoClient, ApplicationPaiementService, ReconciliationService], exports: [JekoClient, ApplicationPaiementService, ReconciliationService] }) export class PaiementsJekoModule {}
