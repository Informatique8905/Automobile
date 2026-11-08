/**
 * ═══════════════════════════════════════════════════════════════════
 * WEBHOOK JEKO — POST /webhooks/jeko
 * ═══════════════════════════════════════════════════════════════════
 * 1. Signature HMAC vérifiée sur le corps BRUT (en temps constant, anti-rejeu)
 * 2. Événement journalisé dans payment_events, même invalide (preuve en cas de litige)
 * 3. Doublon (même identifiant d'événement) → ignoré : Jeko peut renvoyer plusieurs fois
 * 4. On ne croit pas le contenu du webhook : on REDEMANDE le statut à l'API Jeko
 * 5. On applique (handle_jeko_payment_success recontrôle montant et devise)
 * Réponse rapide (200) pour que Jeko ne renvoie pas en boucle ; en cas d'erreur
 * interne → 500 : Jeko renverra, et la réconciliation rattrapera de toute façon.
 * ═══════════════════════════════════════════════════════════════════
 */
import { Controller, Headers, HttpCode, Logger, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { createHash } from 'node:crypto';
import { verifierSignatureHmac } from '@plateforme/securite-applicative';
import { env } from '../../../noyau/config/env';
import { Public } from '../../../noyau/auth/decorateurs';
import { BaseService } from '../../../noyau/base/supabase.service';
import { JekoClient } from './jeko.client';
import { ApplicationPaiementService } from './application-paiement.service';

// Noms d'en-têtes À CONFIRMER avec la documentation Jeko (fichier signalé : « Jeko-Signature »)
const ENTETE_SIGNATURE = 'jeko-signature';
const ENTETE_HORODATAGE = 'jeko-timestamp';

@Controller('webhooks')
export class JekoWebhookController {
  private readonly journal = new Logger('WebhookJeko');

  constructor(
    private readonly base: BaseService,
    private readonly jeko: JekoClient,
    private readonly application: ApplicationPaiementService,
  ) {}

  @Public()
  @Post('jeko')
  @HttpCode(200)
  async recevoir(
    @Req() req: RawBodyRequest<Request>,
    @Headers(ENTETE_SIGNATURE) signature?: string,
    @Headers(ENTETE_HORODATAGE) horodatage?: string,
  ) {
    const brut = req.rawBody;
    if (!brut?.length) throw new UnauthorizedException('EMPTY_BODY');

    const verification = verifierSignatureHmac({
      corpsBrut: brut,
      signatureRecue: signature,
      secret: env.JEKO_WEBHOOK_SECRET,
      horodatage: horodatage || undefined,
      toleranceSecondes: 300,
    });

    let evenement: Record<string, any>;
    try {
      evenement = JSON.parse(brut.toString('utf8'));
    } catch {
      throw new UnauthorizedException('INVALID_JSON');
    }

    const empreinteCorps = createHash('sha256').update(brut).digest('hex');
    // Un appel NON signé ne doit jamais pouvoir « réserver » l'identifiant d'un vrai événement
    // (sinon un attaquant ferait ignorer le vrai webhook comme doublon) : il est rangé à part.
    const idEvenement = verification.valide
      ? String(evenement.id ?? evenement.event_id ?? empreinteCorps)
      : `non_signe:${empreinteCorps}`;

    // Clé secrète justifiée : écriture serveur dans le journal des webhooks (table fermée aux clients)
    const { data: trace, error: erreurTrace } = await this.base.admin
      .from('payment_events')
      .insert({
        provider: 'jeko',
        provider_event_id: idEvenement,
        event_type: String(evenement.type ?? evenement.status ?? 'unknown').slice(0, 100),
        payload: evenement,
        signature_valid: verification.valide,
      })
      .select('id')
      .single();

    if (erreurTrace?.code === '23505') return { recu: true, doublon: true };
    if (erreurTrace || !trace) throw new Error(`payment_events: ${erreurTrace?.message ?? 'insertion vide'}`);

    if (!verification.valide) {
      this.journal.warn(`Signature invalide (${verification.raison}) pour l'événement ${idEvenement}`);
      throw new UnauthorizedException('INVALID_SIGNATURE');
    }

    const idTransaction = String(evenement.transaction_id ?? evenement.data?.id ?? evenement.id ?? '');
    try {
      const tx = await this.jeko.obtenirTransaction(idTransaction); // source de vérité
      const resultat = await this.application.appliquer(tx);
      await this.base.admin.from('payment_events').update({ processed_at: new Date().toISOString() }).eq('id', trace.id);
      return { recu: true, resultat };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await this.base.admin.from('payment_events').update({ processing_error: message.slice(0, 500) }).eq('id', trace.id);
      throw e; // 500 → Jeko renverra ; la réconciliation rattrapera
    }
  }
}
