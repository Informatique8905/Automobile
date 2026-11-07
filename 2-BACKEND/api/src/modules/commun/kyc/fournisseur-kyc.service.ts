import { Injectable } from "@nestjs/common";
@Injectable() export class FournisseurKycService { async creerSession(utilisateurId: string) { return { fournisseur: "kyc", utilisateurId, statut: "a_verifier" }; } }
