import { Controller, Get } from "@nestjs/common";
@Controller("client/contrats") export class ContratsController { @Get() lister() { return []; } }
