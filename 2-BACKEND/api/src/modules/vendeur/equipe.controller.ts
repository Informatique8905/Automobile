import { Controller, Post } from "@nestjs/common";
@Controller("vendeur/equipe") export class EquipeController { @Post("invitations") inviter() { return { statut: "envoye" }; } }
