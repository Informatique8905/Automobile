import { Injectable } from "@nestjs/common";
@Injectable() export class AgentsIaService { async mettreEnFile(job: unknown) { return { statut: "en_file", job }; } }
