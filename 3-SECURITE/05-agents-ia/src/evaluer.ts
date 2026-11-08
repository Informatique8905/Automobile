/**
 * Rejoue evaluations/messages.jsonl avec le pré-filtre (et le modèle si LLM_API_KEY est défini).
 * Usage : pnpm --filter @plateforme/agents-ia evaluer
 */
import { readFileSync } from 'node:fs';
import { preFiltrer } from './pre-filtre.ts';
import { masquerDonneesPersonnelles } from './garde-fous.ts';

const lignes = readFileSync(new URL('../evaluations/messages.jsonl', import.meta.url), 'utf8')
  .split('\n').filter(Boolean).map((l) => JSON.parse(l) as { texte: string; attendu: string });

let accords = 0;
for (const { texte, attendu } of lignes) {
  const { texte: masque } = masquerDonneesPersonnelles(texte);
  const v = preFiltrer(masque);
  const ok = v.decision === attendu;
  if (ok) accords++;
  console.log(`${ok ? '✔' : '✘'} attendu=${attendu.padEnd(5)} obtenu=${v.decision.padEnd(5)} score=${String(v.risk_score).padStart(3)}  ${texte.slice(0, 70)}`);
}
console.log(`\nAccord règles seules : ${accords}/${lignes.length} — l'IA traite les cas que les règles ne voient pas.`);
