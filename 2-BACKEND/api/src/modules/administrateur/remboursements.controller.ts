import { Controller, Post } from "@nestjs/common";
@Controller("administrateur/remboursements") export class RemboursementsController { @Post() creer() { return { statut: "a_valider" }; } }
