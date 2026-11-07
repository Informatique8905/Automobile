export async function executerLot(taches: unknown[]) { return taches.map((tache) => executerAgent("securite", tache)); }
import { executerAgent } from "./executer.js";
