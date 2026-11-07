import { Controller, Get } from "@nestjs/common";
@Controller("vendeur/exports") export class ExportsController { @Get() lister() { return []; } }
