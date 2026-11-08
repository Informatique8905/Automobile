/**
 * Types du fournisseur de paiement (Jeko réel ou simulation).
 * Le reste du projet ne dépend que de cette interface : au branchement de Jeko,
 * seul le fournisseur change, pas les contrôleurs ni la base.
 */

export type MoyenPaiement = 'card' | 'wave' | 'orange_money' | 'mtn_momo' | 'moov_money' | 'djamo' | 'pi_spi_qr';
export type StatutPaiement = 'en_attente' | 'reussi' | 'echoue' | 'annule' | 'expire';

export interface DemandePaiement {
  /** Notre référence (payments.reference, ex. PAY-7K3M9QXA) — renvoyée par le webhook */
  referenceMarchand: string;
  montant: number; // FCFA entiers
  devise: 'XOF';
  description: string;
  urlRetour: string;
  urlNotification: string;
  client?: { nom?: string; telephone?: string; email?: string };
}

export interface SessionPaiement {
  transactionId: string;
  urlPaiement: string;
}

export interface TransactionPaiement {
  transactionId: string;
  referenceMarchand: string;
  statut: StatutPaiement;
  montant: number;
  devise: string;
  moyen: MoyenPaiement | null;
  brut: unknown;
}

export interface DemandeVersement {
  reference: string;
  montant: number;
  moyen: 'mobile_money' | 'bank_transfer';
  destination: string;
  titulaire: string;
}

export interface ResultatVersement {
  reference: string;
  statut: StatutPaiement;
}
