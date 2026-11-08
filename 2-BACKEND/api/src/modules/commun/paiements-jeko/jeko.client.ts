/**
 * ═══════════════════════════════════════════════════════════════════
 * CLIENT JEKO — seul endroit du projet qui parle à l'API de paiement
 * ═══════════════════════════════════════════════════════════════════
 * ⚠ À ADAPTER À LA DOCUMENTATION OFFICIELLE JEKO
 *   La documentation développeur de Jeko n'était pas consultable publiquement
 *   lors de la conception. Les chemins, noms de champs et statuts ci-dessous
 *   sont des emplacements à faire correspondre au contrat et à la documentation
 *   remis par Jeko. Tout le reste du projet ne dépend QUE des types de ce fichier :
 *   si Jeko change, on ne modifie qu'ici.
 *
 * À confirmer par écrit avec Jeko (voir 3-SECURITE/09-checklists/AVANT_LANCEMENT.md) :
 *   - format exact de la signature des webhooks (en-tête, algorithme, horodatage)
 *   - pré-autorisation carte (bloquer une caution sans débiter)
 *   - remboursements par API · versements vers Mobile Money / banque · plafond par transaction
 *   - environnement de test (sandbox)
 * ═══════════════════════════════════════════════════════════════════
 */
import { Injectable, Logger } from '@nestjs/common';
import { env } from '../../../noyau/config/env';
import type { FournisseurPaiement } from './fournisseur-paiement';
import type {
  DemandePaiement,
  DemandeVersement,
  MoyenPaiement,
  ResultatVersement,
  SessionPaiement,
  StatutPaiement,
  TransactionPaiement,
} from './types-paiement';

// Alias historiques : le reste du projet peut continuer d'importer ces noms.
export type { MoyenPaiement as MoyenJeko, StatutPaiement as StatutJeko, TransactionPaiement as TransactionJeko } from './types-paiement';

/** Chemins de l'API Jeko — À CONFIRMER avec la documentation Jeko */
const CHEMINS = {
  creerPaiement: '/v1/payments',
  statutPaiement: (id: string) => `/v1/payments/${encodeURIComponent(id)}`,
  rembourser: '/v1/refunds',
  versement: '/v1/transfers',
} as const;

@Injectable()
export class JekoClient implements FournisseurPaiement {
  private readonly journal = new Logger('Jeko');

  private async appeler<T>(methode: 'GET' | 'POST', chemin: string, corps?: unknown, cleIdempotence?: string): Promise<T> {
    const base = env.JEKO_API_URL;
    const cleApi = env.JEKO_API_KEY;
    if (!base || !cleApi) throw new Error('JEKO_NON_CONFIGURE');

    const controle = new AbortController();
    const minuterie = setTimeout(() => controle.abort(), 15_000);
    try {
      const rep = await fetch(`${base}${chemin}`, {
        method: methode,
        signal: controle.signal,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${cleApi}`, // À CONFIRMER : en-tête d'authentification Jeko
          ...(cleIdempotence ? { 'idempotency-key': cleIdempotence } : {}),
        },
        body: corps ? JSON.stringify(corps) : undefined,
      });
      if (!rep.ok) {
        // On journalise le statut, jamais le corps (il peut contenir des données client)
        this.journal.warn(`Jeko ${methode} ${chemin} → HTTP ${rep.status}`);
        throw new Error(`JEKO_HTTP_${rep.status}`);
      }
      return (await rep.json()) as T;
    } finally {
      clearTimeout(minuterie);
    }
  }

  async creerPaiement(d: DemandePaiement): Promise<SessionPaiement> {
    // Champs À CONFIRMER avec la documentation Jeko
    const r = await this.appeler<Record<string, any>>('POST', CHEMINS.creerPaiement, {
      amount: d.montant,
      currency: d.devise,
      reference: d.referenceMarchand,
      description: d.description,
      return_url: d.urlRetour,
      callback_url: d.urlNotification,
      customer: d.client,
    }, `paiement:${d.referenceMarchand}`);
    return { transactionId: String(r.id ?? r.transaction_id), urlPaiement: String(r.payment_url ?? r.checkout_url) };
  }

  /** Source de vérité : on redemande toujours le statut à Jeko avant de valider. */
  async obtenirTransaction(transactionId: string): Promise<TransactionPaiement> {
    const r = await this.appeler<Record<string, any>>('GET', CHEMINS.statutPaiement(transactionId));
    return {
      transactionId: String(r.id ?? transactionId),
      referenceMarchand: String(r.reference ?? ''),
      statut: JekoClient.convertirStatut(String(r.status ?? '')),
      montant: Number(r.amount),
      devise: String(r.currency ?? ''),
      moyen: JekoClient.convertirMoyen(String(r.payment_method ?? r.channel ?? '')),
      brut: r,
    };
  }

  async rembourser(transactionId: string, montant: number, motif: string, cle: string): Promise<{ reference: string }> {
    const r = await this.appeler<Record<string, any>>('POST', CHEMINS.rembourser,
      { transaction_id: transactionId, amount: montant, reason: motif }, `remboursement:${cle}`);
    return { reference: String(r.id ?? r.reference) };
  }

  async verser(d: DemandeVersement): Promise<ResultatVersement> {
    const r = await this.appeler<Record<string, any>>('POST', CHEMINS.versement, {
      reference: d.reference, amount: d.montant, currency: 'XOF', method: d.moyen, destination: d.destination, holder_name: d.titulaire,
    }, `versement:${d.reference}`);
    return { reference: String(r.id ?? r.reference), statut: JekoClient.convertirStatut(String(r.status ?? 'pending')) };
  }

  // Correspondances À CONFIRMER avec les valeurs réelles renvoyées par Jeko
  static convertirStatut(s: string): StatutPaiement {
    const v = s.toLowerCase();
    if (['success', 'succeeded', 'successful', 'paid', 'completed'].includes(v)) return 'reussi';
    if (['failed', 'failure', 'declined', 'error'].includes(v)) return 'echoue';
    if (['cancelled', 'canceled'].includes(v)) return 'annule';
    if (['expired'].includes(v)) return 'expire';
    return 'en_attente';
  }

  static convertirMoyen(m: string): MoyenPaiement | null {
    const v = m.toLowerCase().replace(/[\s-]/g, '_');
    if (v.includes('wave')) return 'wave';
    if (v.includes('orange')) return 'orange_money';
    if (v.includes('mtn') || v.includes('momo')) return 'mtn_momo';
    if (v.includes('moov')) return 'moov_money';
    if (v.includes('djamo')) return 'djamo';
    if (v.includes('qr') || v.includes('pi_spi')) return 'pi_spi_qr';
    if (v.includes('card') || v.includes('visa') || v.includes('mastercard') || v.includes('gim')) return 'card';
    return null;
  }
}
