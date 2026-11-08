/**
 * ─────────────────────────────────────────────────────────────────────────────
 * EXÉCUTION D'UN AGENT SUR UNE TÂCHE
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. L'agent charge son entrée (texte utilisateur + faits calculés).
 * 2. Les règles déterministes donnent un premier verdict.
 * 3. Si l'agent utilise l'IA : masquage → encadrement → appel du modèle →
 *    validation stricte du JSON → combinaison avec les règles (le plus prudent gagne).
 * 4. On rend le verdict ET les métriques (tokens, coût, durée, empreinte).
 *    C'est la base (complete_ai_job) qui applique les seuils et le mode.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preFiltrer } from './pre-filtre.ts';
import {
  combiner,
  consigneAntiInjection,
  empreinte,
  encadrerContenuNonFiable,
  FORMAT_REPONSE,
  masquerDonneesPersonnelles,
  validerVerdict,
} from './garde-fous.ts';
import type { ContexteAgent, DefinitionAgent, ReglageAgent, Tache, Verdict } from './types.ts';

export interface ResultatAgent {
  verdict: Verdict;
  modele: string;
  empreinteEntree: string;
  tokensEntree: number;
  tokensSortie: number;
  coutUsd: number | null;
  dureeMs: number;
}

const cachePrompts = new Map<string, string>();
function lirePrompt(nom: string, version: string): string {
  const cle = `${nom}@${version}`;
  if (!cachePrompts.has(cle)) {
    // prompts/<nom>.<version>.md, ex. prompts/moderation-annonces.v1.md
    const cheminPrompt = resolve(dirname(fileURLToPath(import.meta.url)), `../prompts/${nom}.${version}.md`);
    cachePrompts.set(cle, readFileSync(cheminPrompt, 'utf8'));
  }
  return cachePrompts.get(cle)!;
}

export async function executerAgent(
  agent: DefinitionAgent,
  tache: Tache,
  reglage: ReglageAgent | undefined,
  ctx: ContexteAgent,
): Promise<ResultatAgent> {
  const debut = Date.now();
  const entree = await agent.charger(ctx, tache.entity_id);

  // L'objet a disparu entre-temps (annonce supprimée, message retiré…)
  if (!entree) {
    return {
      verdict: { decision: 'pass', risk_score: 0, reason_code: 'entity_gone', summary: 'Objet introuvable', flags: [] },
      modele: 'aucun', empreinteEntree: '', tokensEntree: 0, tokensSortie: 0, coutUsd: 0, dureeMs: Date.now() - debut,
    };
  }

  const masque = entree.texteUtilisateur ? masquerDonneesPersonnelles(entree.texteUtilisateur) : null;
  const verdictRegles = agent.regles
    ? combiner(agent.regles(entree), preFiltrer(entree.texteUtilisateur))
    : preFiltrer(entree.texteUtilisateur);
  // Les marqueurs de masquage sont eux-mêmes des indices (un téléphone a été partagé)
  if (masque?.marqueurs.length) {
    verdictRegles.flags = [...new Set([...verdictRegles.flags, ...masque.marqueurs.map((m) => m.slice(1, -1).toLowerCase())])];
  }

  if (!agent.utiliseLLM || !agent.prompt) {
    return {
      verdict: verdictRegles,
      modele: 'regles', empreinteEntree: empreinte(entree.faits), tokensEntree: 0, tokensSortie: 0, coutUsd: 0,
      dureeMs: Date.now() - debut,
    };
  }

  const { bloc, balise } = encadrerContenuNonFiable(masque?.texte ?? '');
  const systeme = [
    lirePrompt(agent.prompt, reglage?.prompt_version ?? 'v1'),
    consigneAntiInjection(balise),
    FORMAT_REPONSE,
  ].join('\n\n');
  const message = [
    'FAITS VÉRIFIÉS PAR LE SYSTÈME (fiables) :',
    JSON.stringify(entree.faits, null, 2),
    '',
    'CONTENU À ANALYSER :',
    bloc,
  ].join('\n');

  const modele = reglage?.model ?? ctx.modeleParDefaut;
  const reponse = await ctx.llm.analyser({ modele, systeme, message, images: entree.images });
  const verdictIA = validerVerdict(reponse.texte); // lève une erreur → la tâche sera retentée

  return {
    verdict: combiner(verdictIA, verdictRegles),
    modele,
    empreinteEntree: empreinte({ faits: entree.faits, texte: masque?.texte, images: entree.images }),
    tokensEntree: reponse.tokensEntree,
    tokensSortie: reponse.tokensSortie,
    coutUsd: reponse.coutUsd,
    dureeMs: Date.now() - debut,
  };
}
