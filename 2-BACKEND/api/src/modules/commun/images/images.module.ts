import { Module } from "@nestjs/common";
import { TraitementImagesService } from "./traitement-images.service.js";
@Module({ providers: [TraitementImagesService], exports: [TraitementImagesService] }) export class ImagesModule {}
