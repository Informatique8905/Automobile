import { Controller, Post } from "@nestjs/common";
@Controller("vendeur/etats-des-lieux") export class EtatsDesLieuxController { @Post("photos") envoyer() { return { statut: "stocke" }; } }
