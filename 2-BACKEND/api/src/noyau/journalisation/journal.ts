import { Injectable } from "@nestjs/common";
@Injectable() export class Journal { ecrire(niveau: string, message: string, contexte?: unknown) { console.log(JSON.stringify({ niveau, message, contexte, date: new Date().toISOString() })); } }
