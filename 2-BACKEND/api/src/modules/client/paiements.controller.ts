import { Controller, Post } from "@nestjs/common";
@Controller("client/paiements") export class PaiementsController { @Post("initier") initier() { return { statut: "a_traiter" }; } }
