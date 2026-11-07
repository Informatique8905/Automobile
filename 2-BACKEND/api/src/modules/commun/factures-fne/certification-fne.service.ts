import { Injectable } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
@Injectable() export class CertificationFneService { async certifier(facture: unknown) { return { statut: "en_attente_fne", facture }; } verifierSignature(corps: string, signature: string, secret: string) { const attendu = createHmac("sha256", secret).update(corps).digest("hex"); const a = Buffer.from(signature); const b = Buffer.from(attendu); return a.length === b.length && timingSafeEqual(a, b); } }
