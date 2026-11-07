/**
 * ═══════════════════════════════════════════════════════════════════
 * TÂCHES INTERNES — POST /interne/taches/executer
 * ═══════════════════════════════════════════════════════════════════
 * Appelée toutes les 5 minutes par la base (pg_cron + pg_net, voir
 * 2-BACKEND/base-de-donnees/supabase/optional/cron_render.sql).
 * - Protégée par un secret partagé (en-tête X-Cron-Secret), comparé en temps constant.
 * - Répond tout de suite (202) puis travaille en arrière-plan : l'appel réveille
 *   aussi l'instance Render gratuite.
 * - Une seule exécution à la fois : un appel pendant une exécution est ignoré.
 * ═══════════════════════════════════════════════════════════════════
 */
import { Controller, Headers, HttpCode, Logger, Post, UnauthorizedException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { secretsEgaux } from '@plateforme/securite-applicative';
import { env } from '../noyau/config/env';
import { Public } from '../noyau/auth/decorateurs';
import { OrchestrateurService } from './orchestrateur.service';

@Controller('interne/taches')
export class TachesController {
  private readonly journal = new Logger('Taches');
  private enCours = false;

  constructor(private readonly orchestrateur: OrchestrateurService) {}

  @Public()
  @SkipThrottle()
  @Post('executer')
  @HttpCode(202)
  executer(@Headers('x-cron-secret') secret?: string) {
    if (!secretsEgaux(secret, env.CRON_SECRET)) throw new UnauthorizedException();
    if (this.enCours) return { statut: 'deja_en_cours' };

    this.enCours = true;
    void this.orchestrateur
      .executer()
      .then((bilan) => this.journal.log(`Tâches terminées : ${JSON.stringify(bilan)}`))
      .catch((e) => this.journal.error(`Tâches en échec : ${e instanceof Error ? e.message : e}`))
      .finally(() => (this.enCours = false));
    return { statut: 'lance' };
  }
}
