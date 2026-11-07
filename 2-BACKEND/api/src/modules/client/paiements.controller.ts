/**
 * ═══════════════════════════════════════════════════════════════════
 * CLIENT · PAIEMENTS — POST /client/paiements/initier
 * ═══════════════════════════════════════════════════════════════════
 * CAHIER DES CHARGES
 *   Tunnel de réservation, étape c) « Récapitulatif détaillé et paiement sécurisé »
 *   Modes de paiement : cartes, Mobile Money (via Jeko)
 *
 * DÉROULÉ
 *   1. create_booking_payment AVEC LE JETON DU CLIENT : la base vérifie que la
 *      réservation est la sienne, payable, non expirée, et fixe le MONTANT.
 *      Le navigateur n'envoie jamais de montant.
 *   2. Si un lien Jeko existe déjà pour ce paiement → on le renvoie (double clic).
 *   3. Sinon création de la session Jeko, enregistrement du lien, renvoi du lien.
 *
 * ERREURS RENVOYÉES (traduites par 1-FRONTEND/commun/i18n)
 *   BOOKING_NOT_FOUND, BOOKING_NOT_PAYABLE, BOOKING_EXPIRED, DEPOSIT_NOT_PAYABLE_ONLINE,
 *   AMOUNT_ABOVE_PROVIDER_LIMIT (plafond Jeko : proposer de contacter l'agence)
 * ═══════════════════════════════════════════════════════════════════
 */
import { BadRequestException, Body, Controller, Post, ServiceUnavailableException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { LIMITES } from '@plateforme/securite-applicative';
import { env } from '../../noyau/config/env';
import { Roles, UtilisateurCourant } from '../../noyau/auth/decorateurs';
import type { Utilisateur } from '../../noyau/auth/decorateurs';
import { BaseService } from '../../noyau/base/supabase.service';
import { JekoClient } from '../commun/paiements-jeko/jeko.client';

const Demande = z.object({
  reservationId: z.uuid(),
  objet: z.enum(['rental', 'deposit']).default('rental'),
});

@Controller('client/paiements')
@Roles('client')
export class PaiementsClientController {
  constructor(
    private readonly base: BaseService,
    private readonly jeko: JekoClient,
  ) {}

  @Post('initier')
  @Throttle({ default: { limit: LIMITES.initierPaiement.limite, ttl: LIMITES.initierPaiement.fenetreSecondes * 1000 } })
  async initier(@UtilisateurCourant() u: Utilisateur, @Body() corps: unknown) {
    const demande = Demande.safeParse(corps);
    if (!demande.success) throw new BadRequestException('INVALID_REQUEST');

    // 1. Au nom du client : la RLS et la fonction vérifient tout, y compris le montant
    const { data, error } = await this.base.pourUtilisateur(u.jeton).rpc('create_booking_payment', {
      p_booking_id: demande.data.reservationId,
      p_purpose: demande.data.objet,
    });
    if (error) throw new BadRequestException(error.message);
    const paiement = data as { payment_id: string; reference: string; amount: number; status: string; provider_payment_url: string | null };

    // 2. Idempotence : un lien existe déjà
    if (paiement.provider_payment_url && ['initiated', 'pending'].includes(paiement.status)) {
      return { url: paiement.provider_payment_url, reference: paiement.reference };
    }
    if (paiement.status === 'succeeded') return { dejaPaye: true, reference: paiement.reference };

    // 3. Session Jeko
    let session;
    try {
      session = await this.jeko.creerPaiement({
        referenceMarchand: paiement.reference,
        montant: paiement.amount,
        devise: 'XOF',
        description: `Réservation ${paiement.reference}`,
        urlRetour: `${env.JEKO_RETURN_URL}?ref=${encodeURIComponent(paiement.reference)}`,
        urlNotification: `${env.API_PUBLIC_URL}/webhooks/jeko`,
        client: { email: u.email },
      });
    } catch {
      throw new ServiceUnavailableException('PAYMENT_PROVIDER_UNAVAILABLE');
    }

    // Clé secrète justifiée : seul le serveur enregistre le lien et l'identifiant Jeko
    await this.base.admin
      .from('payments')
      .update({ status: 'pending', provider_transaction_id: session.transactionId, provider_payment_url: session.urlPaiement })
      .eq('id', paiement.payment_id)
      .eq('status', 'initiated');

    return { url: session.urlPaiement, reference: paiement.reference };
  }
}
