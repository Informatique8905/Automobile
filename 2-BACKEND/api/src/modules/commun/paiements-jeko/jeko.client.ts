import { Injectable } from "@nestjs/common";
@Injectable() export class JekoClient { async creerTransaction(transaction: unknown) { return { fournisseur: "jeko", statut: "a_soumettre", transaction }; } async consulter(transactionId: string) { return { transactionId, statut: "inconnu" }; } }
