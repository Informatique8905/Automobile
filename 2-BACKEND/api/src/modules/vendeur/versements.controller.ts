import { Controller, Post } from "@nestjs/common";
@Controller("vendeur/versements") export class VersementsController { @Post("comptes") ajouter() { return { statut: "a_verifier" }; } }
