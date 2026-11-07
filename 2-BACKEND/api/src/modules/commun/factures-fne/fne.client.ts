import { Injectable } from "@nestjs/common";
@Injectable() export class FneClient { async envoyer(facture: unknown) { return { fournisseur: "fne", statut: "a_soumettre", facture }; } }
