import { Injectable } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
@Injectable() export class ChiffrementService { chiffrer(valeur: string) { return createHmac("sha256", process.env.CHIFFREMENT_CLE ?? "cle-developpement").update(valeur).digest("hex"); } verifier(valeur: string, attendu: string) { const a = Buffer.from(valeur); const b = Buffer.from(attendu); return a.length === b.length && timingSafeEqual(a, b); } }
