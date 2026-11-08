/**
 * ═══════════════════════════════════════════════════════════════════
 * ORCHESTRATEUR DES TÂCHES DE FOND (ordre = priorité)
 * ═══════════════════════════════════════════════════════════════════
 *  1. Réconciliation des paiements Jeko      (l'argent d'abord)
 *  2. Envoi des notifications en attente     (e-mail, SMS, WhatsApp, push)
 *  3. Agents IA (lot de 45 s maximum)        (modération et sécurité)
 *  4. Certification des factures FNE         (DGI)
 *  5. Synthèse sécurité quotidienne          (une fois par jour, après 7 h)
 * Chaque étape est isolée : l'échec de l'une n'empêche pas les suivantes.
 * Les tâches purement « base de données » (expiration des réservations,
 * libération des cautions…) tournent directement dans pg_cron (optional/cron.sql).
 * ═══════════════════════════════════════════════════════════════════
 */
import { Injectable, Logger } from '@nestjs/common';
import { ReconciliationService } from '../modules/commun/paiements-jeko/reconciliation.service';
import { EnvoiNotificationsService } from '../modules/commun/notifications/envoi-notifications.service';
import { AgentsIaService } from '../modules/commun/ia/agents-ia.service';
import { CertificationFneService } from '../modules/commun/factures-fne/certification-fne.service';

type Bilan = Record<string, unknown>;

@Injectable()
export class OrchestrateurService {
  private readonly journal = new Logger('Orchestrateur');

  constructor(
    private readonly reconciliation: ReconciliationService,
    private readonly notifications: EnvoiNotificationsService,
    private readonly agents: AgentsIaService,
    private readonly fne: CertificationFneService,
  ) {}

  async executer(): Promise<Bilan> {
    const bilan: Bilan = {};
    await this.etape(bilan, 'paiements', () => this.reconciliation.executer());
    await this.etape(bilan, 'notifications', () => this.notifications.envoyerEnAttente());
    await this.etape(bilan, 'agents_ia', () => this.agents.executerLot(45_000));
    await this.etape(bilan, 'factures_fne', () => this.fne.certifierEnAttente());
    await this.etape(bilan, 'synthese_securite', () => this.agents.syntheseQuotidienneSiNecessaire());
    return bilan;
  }

  private async etape(bilan: Bilan, nom: string, action: () => Promise<unknown>) {
    const debut = Date.now();
    try {
      bilan[nom] = { ok: true, resultat: await action(), ms: Date.now() - debut };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.journal.error(`Étape ${nom} en échec : ${message}`);
      bilan[nom] = { ok: false, erreur: message, ms: Date.now() - debut };
    }
  }
}
