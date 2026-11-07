import { Injectable } from "@nestjs/common";
import { JekoClient } from "./jeko.client.js";
@Injectable() export class ReconciliationService { constructor(private readonly jeko: JekoClient) {} async reconciller() { return { statut: "planifie" }; } }
