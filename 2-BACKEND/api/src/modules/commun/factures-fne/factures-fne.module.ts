import { Module } from "@nestjs/common";
import { CertificationFneService } from "./certification-fne.service.js";
import { FneClient } from "./fne.client.js";
@Module({ providers: [CertificationFneService, FneClient], exports: [CertificationFneService, FneClient] }) export class FacturesFneModule {}
