import { Controller, Post } from "@nestjs/common";
@Controller("client/kyc") export class KycController { @Post("session") session() { return { statut: "a_traiter" }; } }
