/**
 * FOURNISSEUR DE PAIEMENT SIMULÉ — PAIEMENT_MODE=simulation
 * ═══════════════════════════════════════════════════════════════════
 * Reproduit exactement l'interface de JekoClient sans argent réel :
 *   • creerPaiement   → transaction « sim_… » + page de test /paiement-test/:id
 *   • obtenirTransaction → statut choisi sur la page de test
 *   • la page de test envoie ensuite un webhook SIGNÉ vers /webhooks/jeko,
 *     donc le même chemin de traitement qu'un vrai paiement Jeko.
 *
 * Limites assumées (mode test uniquement) :
 *   • l'état vit en mémoire : un redémarrage de l'API remet les transactions
 *     « en attente » (la réconciliation les ignore, jamais de faux succès) ;
 *   • impossible à activer en production sans AUTORISER_PAIEMENT_SIMULATION=true.
 * ═══════════════════════════════════════════════════════════════════
 */
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { env } from '../../../noyau/config/env';
import type { FournisseurPaiement } from './fournisseur-paiement';
import type {
  DemandePaiement,
  DemandeVersement,
  ResultatVersement,
  SessionPaiement,
  StatutPaiement,
  TransactionPaiement,
} from './types-paiement';

interface TransactionSimulee {
  referenceMarchand: string;
  montant: number;
  devise: string;
  statut: StatutPaiement;
  creeLe: number;
}

export type ResultatTest = 'succes' | 'echec' | 'abandon';

@Injectable()
export class PaiementSimulationService implements FournisseurPaiement {
  private readonly transactions = new Map<string, TransactionSimulee>();

  async creerPaiement(d: DemandePaiement): Promise<SessionPaiement> {
    const transactionId = `sim_${randomUUID()}`;
    this.transactions.set(transactionId, {
      referenceMarchand: d.referenceMarchand,
      montant: d.montant,
      devise: d.devise,
      statut: 'en_attente',
      creeLe: Date.now(),
    });
    return { transactionId, urlPaiement: `${env.API_PUBLIC_URL}/paiement-test/${transactionId}` };
  }

  async obtenirTransaction(transactionId: string): Promise<TransactionPaiement> {
    const tx = this.transactions.get(transactionId);
    if (!tx) {
      // Transaction inconnue (ex. après redémarrage) : jamais de faux succès.
      return {
        transactionId,
        referenceMarchand: '',
        statut: 'en_attente',
        montant: 0,
        devise: 'XOF',
        moyen: null,
        brut: { simulation: 'transaction_inconnue' },
      };
    }
    return {
      transactionId,
      referenceMarchand: tx.referenceMarchand,
      statut: tx.statut,
      montant: tx.montant,
      devise: tx.devise,
      moyen: 'wave', // moyen de test fixe, sans valeur réelle
      brut: { simulation: true, statut: tx.statut },
    };
  }

  decrire(transactionId: string) {
    const tx = this.transactions.get(transactionId);
    return tx ? { transactionId, ...tx } : null;
  }

  resultat(transactionId: string, resultat: ResultatTest): boolean {
    const tx = this.transactions.get(transactionId);
    if (!tx || tx.statut !== 'en_attente') return false;
    tx.statut = resultat === 'succes' ? 'reussi' : resultat === 'echec' ? 'echoue' : 'annule';
    return true;
  }

  async rembourser(): Promise<{ reference: string }> {
    return { reference: `sim_rmb_${randomUUID()}` };
  }

  async verser(d: DemandeVersement): Promise<ResultatVersement> {
    return { reference: `sim_vrs_${d.reference}_${randomUUID().slice(0, 8)}`, statut: 'reussi' };
  }
}
