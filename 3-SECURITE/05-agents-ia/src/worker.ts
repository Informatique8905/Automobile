/**
 * ─────────────────────────────────────────────────────────────────────────────
 * WORKER DES AGENTS IA — appelé par l'API Render (POST /interne/taches/executer)
 * ─────────────────────────────────────────────────────────────────────────────
 * Boucle : réclamer un petit lot (claim_ai_jobs) → analyser → rendre le verdict
 * (complete_ai_job), tant qu'il reste du temps dans le budget de l'appel.
 *
 * Robustesse (Render gratuit peut redémarrer à tout moment) :
 *   - petits lots, délai par tâche : rien ne reste bloqué longtemps ;
 *   - une tâche « processing » abandonnée est reprise par la base après 10 min ;
 *   - une erreur (modèle indisponible, JSON invalide) → nouvel essai avec délai
 *     croissant, puis « failed » après 3 essais : visible dans le back-office.
 * La base décide de tout le reste : agents arrêtés, budget, seuils, mode.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { AGENTS } from './agents/index.ts';
import { executerAgent } from './executer.ts';
import type { ContexteAgent, ReglageAgent, Tache } from './types.ts';

export interface OptionsLot {
  /** Durée maximale de l'appel (ms) — rester sous le délai du déclencheur */
  budgetMs?: number;
  tailleLot?: number;
  nomWorker?: string;
}

export interface BilanLot {
  traitees: number;
  echecs: number;
  dureeMs: number;
}

export async function executerLot(ctx: ContexteAgent, o: OptionsLot = {}): Promise<BilanLot> {
  const debut = Date.now();
  const budget = o.budgetMs ?? 45_000;
  let traitees = 0;
  let echecs = 0;

  const { data: reglages } = await ctx.base.from('ai_agents').select('job_type, mode, model, prompt_version').returns<ReglageAgent[]>();
  const reglageDe = new Map((reglages ?? []).map((r) => [r.job_type, r]));

  while (Date.now() - debut < budget - 20_000) {
    const { data: taches, error } = await ctx.base.rpc('claim_ai_jobs', {
      p_limit: o.tailleLot ?? 5,
      p_worker: o.nomWorker ?? 'render',
    });
    if (error) {
      ctx.journal('error', 'claim_ai_jobs a échoué', { message: error.message });
      break;
    }
    const lot = (taches ?? []) as Tache[];
    if (!lot.length) break;

    for (const tache of lot) {
      const agent = AGENTS[tache.job_type];
      try {
        if (!agent) throw new Error(`AGENT_INCONNU:${tache.job_type}`);
        const r = await executerAgent(agent, tache, reglageDe.get(tache.job_type), ctx);
        const { error: e } = await ctx.base.rpc('complete_ai_job', {
          p_job_id: tache.id,
          p_success: true,
          p_decision: r.verdict.decision,
          p_risk_score: r.verdict.risk_score,
          p_reason_code: r.verdict.reason_code,
          p_explanation: { summary: r.verdict.summary, flags: r.verdict.flags },
          p_agent: tache.job_type,
          p_model: r.modele,
          p_input_hash: r.empreinteEntree,
          p_tokens_input: r.tokensEntree,
          p_tokens_output: r.tokensSortie,
          p_latency_ms: r.dureeMs,
          p_cost_usd: r.coutUsd,
        });
        if (e) throw new Error(`complete_ai_job: ${e.message}`);
        traitees++;
      } catch (err) {
        echecs++;
        const message = err instanceof Error ? err.message : String(err);
        ctx.journal('warn', 'Agent en échec', { tache: tache.id, type: tache.job_type, message });
        await ctx.base.rpc('complete_ai_job', {
          p_job_id: tache.id,
          p_success: false,
          p_agent: tache.job_type,
          p_error: message.slice(0, 500),
        });
      }
    }
  }

  return { traitees, echecs, dureeMs: Date.now() - debut };
}
