import { Controller, Get } from "@nestjs/common";
@Controller("administrateur/incidents") export class IncidentsController { @Get() lister() { return []; } }
