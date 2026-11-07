import { Controller, Get } from "@nestjs/common";
@Controller("administrateur/mes-donnees") export class MesDonneesController { @Get() demandes() { return []; } }
