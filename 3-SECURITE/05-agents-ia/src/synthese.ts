/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AGENT « SYNTHÈSE SÉCURITÉ » — une fois par jour, envoyé aux administrateurs
 * ─────────────────────────────────────────────────────────────────────────────
 * Rassemble les chiffres des dernières 24 h (aucune donnée personnelle : seulement
 * des compteurs et des codes), demande au modèle un résumé en 5 points avec les
 * actions prioritaires, et renvoie un texte prêt à être envoyé par e-mail.
 * Sans modèle disponible, le résumé chiffré brut est envoyé quand même.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ContexteAgent } from './types.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ligne = Record<string, any>;

function compterPar<T extends Ligne>(lignes: T[], cle: keyof T): Record<string, number> {
  return lignes.reduce<Record<string, number>>((acc, l) => {
    const k = String(l[cle]);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

export async function genererSyntheseSecurite(ctx: ContexteAgent): Promise<{ titre: string; texte: string; chiffres: Ligne }> {
  const depuis = new Date(Date.now() - 86_400_000).toISOString();
  const [ev, fraude, flags, runs, ouverts] = await Promise.all([
    ctx.base.from('security_events').select('event_type, severity').gte('created_at', depuis).limit(5000).returns<Ligne[]>(),
    ctx.base.from('fraud_signals').select('signal_type, severity').gte('created_at', depuis).limit(2000).returns<Ligne[]>(),
    ctx.base.from('moderation_flags').select('entity_type, source, status').gte('created_at', depuis).limit(2000).returns<Ligne[]>(),
    ctx.base.from('ai_agent_runs').select('agent, decision, cost_usd').gte('created_at', depuis).limit(10000).returns<Ligne[]>(),
    ctx.base.from('moderation_flags').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_review']),
  ]);

  const chiffres = {
    evenements_securite: compterPar(ev.data ?? [], 'event_type'),
    evenements_graves: (ev.data ?? []).filter((e) => e.severity >= 4).length,
    signaux_fraude: compterPar(fraude.data ?? [], 'signal_type'),
    signalements_nouveaux: compterPar(flags.data ?? [], 'entity_type'),
    signalements_en_attente_total: ouverts.count ?? 0,
    decisions_ia: compterPar(runs.data ?? [], 'decision'),
    erreurs_agents: (runs.data ?? []).filter((r) => r.decision === 'error').length,
    cout_ia_usd: Number((runs.data ?? []).reduce((s, r) => s + Number(r.cost_usd ?? 0), 0).toFixed(4)),
  };

  const titre = `Synthèse sécurité du ${new Date().toLocaleDateString('fr-FR', { timeZone: 'Africa/Abidjan' })}`;
  const brut = '```json\n' + JSON.stringify(chiffres, null, 2) + '\n```';

  try {
    const systeme = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../prompts/synthese-securite.v1.md'), 'utf8');
    const r = await ctx.llm.analyser({ modele: ctx.modeleParDefaut, systeme, message: brut, maxTokens: 700 });
    return { titre, texte: `${r.texte}\n\n---\nChiffres bruts :\n${brut}`, chiffres };
  } catch (e) {
    ctx.journal('warn', 'Synthèse IA indisponible, envoi des chiffres bruts', { message: String(e) });
    return { titre, texte: `Résumé IA indisponible.\n\n${brut}`, chiffres };
  }
}
