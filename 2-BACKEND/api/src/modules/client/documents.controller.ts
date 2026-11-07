import { Controller, Get } from "@nestjs/common";
@Controller("client/documents") export class DocumentsController { @Get() lister() { return []; } }
