import { Controller, Get } from "@nestjs/common";
@Controller("client/mes-donnees") export class MesDonneesController { @Get() exporter() { return { statut: "export_demande" }; } }
