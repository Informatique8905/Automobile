import { Controller, Get } from "@nestjs/common";
@Controller("administrateur/agents-ia") export class AgentsIaController { @Get() lister() { return []; } }
