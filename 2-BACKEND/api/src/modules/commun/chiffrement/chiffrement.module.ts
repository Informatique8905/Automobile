import { Module } from "@nestjs/common";
import { ChiffrementService } from "./chiffrement.service.js";
@Module({ providers: [ChiffrementService], exports: [ChiffrementService] }) export class ChiffrementModule {}
