import { Controller, Post } from "@nestjs/common";
@Controller("taches") export class TachesController { @Post("executer") executer() { return { statut: "planifie" }; } }
