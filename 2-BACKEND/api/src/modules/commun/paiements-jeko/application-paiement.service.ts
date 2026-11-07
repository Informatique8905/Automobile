import { Injectable } from "@nestjs/common";
@Injectable() export class ApplicationPaiementService { async appliquer(resultat: unknown) { return { statut: "applique", resultat }; } }
