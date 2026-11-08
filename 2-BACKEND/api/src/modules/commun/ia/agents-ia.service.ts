/**
 * ═══════════════════════════════════════════════════════════════════
 * PONT ENTRE L'API ET LES AGENTS IA (code dans 3-SECURITE/05-agents-ia)
 * ═══════════════════════════════════════════════════════════════════
 * L'API fournit : le client Supabase serveur, le fournisseur de modèle IA, le
 * journal. Les agents, garde-fous et prompts restent dans 3-SECURITE pour être
 * relus et testés à part.
 * ═══════════════════════════════════════════════════════════════════
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  executerLot,
  FournisseurAnthropic,
  FournisseurFactice,
  genererSyntheseSecurite,
  type ContexteAgent,
} from '@plateforme/agents-ia';
import { env } from '../../../noyau/config/env';
import { BaseService } from '../../../noyau/base/supabase.service';
import { EnvoiNotificationsService } from '../notifications/envoi-notifications.service';

const CLE_DERNIERE_SYNTHESE = 'derniere_synthese_securite';

@Injectable()
export class AgentsIaService {
  private readonly journal = new Logger('AgentsIA');
  private readonly ctx: ContexteAgent;

  constructor(
    private readonly base: BaseService,
    private readonly notifications: EnvoiNotificationsService,
  ) {
    const llm =
      env.LLM_PROVIDER === 'anthropic' && env.LLM_API_KEY
        ? new FournisseurAnthropic(env.LLM_API_KEY, env.LLM_PRIX_ENTREE_USD_PAR_MTOK ?? null, env.LLM_PRIX_SORTIE_USD_PAR_MTOK ?? null)
        : new FournisseurFactice('{"decision":"pass","risk_score":0,"reason_code":"dev_mode","summary":"Mode développement","flags":[]}');
    this.ctx = {
      // Clé secrète justifiée : les agents lisent des données de plusieurs utilisateurs
      base: this.base.admin,
      llm,
      modeleParDefaut: env.LLM_DEFAULT_MODEL,
      journal: (niveau, message, details) => this.journal[niveau === 'info' ? 'log' : niveau](`${message} ${details ? JSON.stringify(details) : ''}`),
    };
  }

  executerLot(budgetMs: number) {
    return executerLot(this.ctx, { budgetMs, nomWorker: `render-${process.env.RENDER_INSTANCE_ID ?? 'local'}` });
  }

  /** Une fois par jour, après 7 h (Abidjan = UTC) : synthèse envoyée aux administrateurs. */
  async syntheseQuotidienneSiNecessaire() {
    const maintenant = new Date();
    if (maintenant.getUTCHours() < 7) return 'trop_tot';
    const aujourdhui = maintenant.toISOString().slice(0, 10);

    const { data } = await this.base.admin.from('platform_settings').select('value').eq('key', CLE_DERNIERE_SYNTHESE).maybeSingle();
    if (data?.value === aujourdhui) return 'deja_envoyee';

    const synthese = await genererSyntheseSecurite(this.ctx);
    await this.notifications.envoyerAuxAdministrateurs(synthese.titre, synthese.texte);
    await this.base.admin.from('platform_settings').upsert({
      key: CLE_DERNIERE_SYNTHESE, value: aujourdhui, description: 'Date de la dernière synthèse sécurité envoyée', is_public: false,
    });
    return 'envoyee';
  }
}
