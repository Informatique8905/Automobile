import { Module } from "@nestjs/common";
import { PhotosController } from "./photos.controller.js";
import { VersementsController } from "./versements.controller.js";
import { EquipeController } from "./equipe.controller.js";
import { EtatsDesLieuxController } from "./etats-des-lieux.controller.js";
import { ExportsController } from "./exports.controller.js";
@Module({ controllers: [PhotosController, VersementsController, EquipeController, EtatsDesLieuxController, ExportsController] }) export class VendeurModule {}
