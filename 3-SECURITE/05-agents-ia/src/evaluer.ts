import { readFileSync } from "node:fs";
import { preFiltrer } from "./pre-filtre.js";
export function evaluer(chemin: string) { return readFileSync(chemin, "utf8").trim().split("\n").map((ligne) => { const e = JSON.parse(ligne) as { texte: string; attendu: string }; return { attendu: e.attendu, resultat: preFiltrer(e.texte) }; }); }
