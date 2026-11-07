import { Module } from "@nestjs/common";
import { PaiementsJekoModule } from "./paiements-jeko/paiements-jeko.module.js";
import { FacturesFneModule } from "./factures-fne/factures-fne.module.js";
import { KycModule } from "./kyc/kyc.module.js";
import { NotificationsModule } from "./notifications/notifications.module.js";
import { ContratsPdfModule } from "./contrats-pdf/contrats-pdf.module.js";
import { ImagesModule } from "./images/images.module.js";
import { ChiffrementModule } from "./chiffrement/chiffrement.module.js";
import { IaModule } from "./ia/ia.module.js";
@Module({ imports: [PaiementsJekoModule, FacturesFneModule, KycModule, NotificationsModule, ContratsPdfModule, ImagesModule, ChiffrementModule, IaModule] }) export class CommunModule {}
