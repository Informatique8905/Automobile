import { Module } from "@nestjs/common";
import { FournisseurKycService } from "./fournisseur-kyc.service.js";
import { KycWebhookController } from "./kyc-webhook.controller.js";
@Module({ controllers: [KycWebhookController], providers: [FournisseurKycService], exports: [FournisseurKycService] }) export class KycModule {}
