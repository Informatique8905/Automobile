/**
 * ═══════════════════════════════════════════════════════════════════
 * APPLIQUER LE RÉSULTAT D'UNE TRANSACTION JEKO DANS LA BASE
 * ═══════════════════════════════════════════════════════════════════
 * Utilisé par le webhook ET par la réconciliation : une seule logique, donc un
 * paiement est traité exactement de la même façon quel que soit le chemin.
 * Idempotent : appliquer deux fois le même résultat ne change rien
 * (la base renvoie « already_processed »).
 * ═══════════════════════════════════════════════════════════════════
 */
import { Injectable, Logger } from '@nestjs/common';
import { BaseService } from '../../../noyau/base/supabase.service';
import { TransactionJeko } from './jeko.client';

@Injectable()
export class ApplicationPaiementService {
  private readonly journal = new Logger('Paiements');

  constructor(private readonly base: BaseService) {}

  async appliquer(tx: TransactionJeko): Promise<string> {
    // Clé secrète justifiée : appel serveur après vérification Jeko, aucun utilisateur connecté
    const { data: paiement } = await this.base.admin
      .from('payments')
      .select('id, status, amount')
      .eq('reference', tx.referenceMarchand)
      .maybeSingle();
    if (!paiement) {
      this.journal.warn(`Transaction Jeko ${tx.transactionId} sans paiement correspondant`);
      return 'payment_unknown';
    }

    if (tx.statut === 'reussi') {
      const { data, error } = await this.base.admin.rpc('handle_jeko_payment_success', {
        p_payment_id: paiement.id,
        p_provider_transaction_id: tx.transactionId,
        p_method: tx.moyen ?? 'card', // moyen non communiqué par Jeko : à préciser avec leur documentation
        p_amount: tx.montant,     // recontrôlé par la base : un écart crée un signal de fraude
        p_currency: tx.devise,
        p_payload: { statut: tx.statut, moyen: tx.moyen },
      });
      if (error) throw new Error(`handle_jeko_payment_success: ${error.message}`);
      return String((data as { status?: string })?.status ?? 'ok');
    }

    if (tx.statut === 'echoue' || tx.statut === 'annule' || tx.statut === 'expire') {
      const { error } = await this.base.admin.rpc('handle_payment_failure', {
        p_payment_id: paiement.id,
        p_reason: `jeko_${tx.statut}`,
        p_payload: { statut: tx.statut },
      });
      if (error) throw new Error(`handle_payment_failure: ${error.message}`);
      return 'failed';
    }

    return 'pending';
  }
}
