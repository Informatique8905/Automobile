import { Controller, Get } from "@nestjs/common";
@Controller("sante") export class SanteController { @Get() verifier() { return { statut: "ok" }; } }
