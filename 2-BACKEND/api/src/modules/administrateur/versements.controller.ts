import { Controller, Post } from "@nestjs/common";
@Controller("administrateur/versements") export class VersementsController { @Post() ordonner() { return { statut: "a_verifier" }; } }
