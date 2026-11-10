/**
 * Interface unique du fournisseur de paiement.
 * Implémentations : JekoClient (API réelle) et PaiementSimulationService (tests).
 */
import type {
  DemandePaiement,
  DemandeVersement,
  ResultatVersement,
  SessionPaiement,
  TransactionPaiement,
} from './types-paiement';

export const FOURNISSEUR_PAIEMENT = 'FOURNISSEUR_PAIEMENT';

export interface FournisseurPaiement {
  creerPaiement(demande: DemandePaiement): Promise<SessionPaiement>;
  /** Source de vérité : on redemande toujours le statut au fournisseur. */
  obtenirTransaction(transactionId: string): Promise<TransactionPaiement>;
  rembourser(transactionId: string, montant: number, motif: string, cle: string): Promise<{ reference: string }>;
  verser(demande: DemandeVersement): Promise<ResultatVersement>;
}
