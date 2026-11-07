import { Controller, Post, Headers } from "@nestjs/common";
@Controller("webhooks/jeko") export class JekoWebhookController { @Post() recevoir(@Headers("x-jeko-signature") signature?: string) { return { statut: "signature_a_verifier", signature: Boolean(signature) }; } }
