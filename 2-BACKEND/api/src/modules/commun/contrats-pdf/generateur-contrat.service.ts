import { Injectable } from "@nestjs/common";
@Injectable() export class GenerateurContratService { generer(contrat: unknown) { return { format: "pdf", contrat }; } }
