import { Controller, Get } from "@nestjs/common";
@Controller("client/factures") export class FacturesController { @Get() lister() { return []; } }
