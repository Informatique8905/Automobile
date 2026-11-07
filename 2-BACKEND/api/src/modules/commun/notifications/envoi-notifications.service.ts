import { Injectable } from "@nestjs/common";
@Injectable() export class EnvoiNotificationsService { async envoyer(canaux: string[], message: unknown) { return { canaux, message, statut: "planifie" }; } }
