import { Controller, Get } from "@nestjs/common";
@Controller("administrateur/documents") export class DocumentsController { @Get() lister() { return []; } }
