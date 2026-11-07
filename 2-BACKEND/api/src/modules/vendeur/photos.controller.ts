import { Controller, Post } from "@nestjs/common";
@Controller("vendeur/photos") export class PhotosController { @Post("traiter") traiter() { return { statut: "a_traiter" }; } }
