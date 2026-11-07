import { Controller, Post } from "@nestjs/common";
@Controller("webhooks/kyc") export class KycWebhookController { @Post() recevoir() { return { statut: "recu" }; } }
