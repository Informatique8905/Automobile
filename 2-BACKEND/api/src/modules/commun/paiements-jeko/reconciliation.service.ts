/**
 * ═══════════════════════════════════════════════════════════════════
 * RÉCONCILIATION DES PAIEMENTS — toutes les 5 minutes (tâches internes)
 * ═══════════════════════════════════════════════════════════════════
 * Pourquoi : un webhook peut se perdre (API Render endormie, coupure réseau,
 * erreur temporaire). Sans réconciliation, un client qui a payé resterait
 * « en attente » et sa réservation expirerait.
 * Comment : pour chaque paiement « pending » de plus de 2 minutes et de moins de
 * 24 heures, on demande son statut à Jeko et on applique le résultat — par la
 * MÊME logique que le webhook (ApplicationPaiementService).
 * ═══════════════════════════════════════════════════════════════════
 */
import { Injectable, Logger } from '@nestjs/common';
import { BaseService } from '../../../noyau/base/supabase.service';
import { JekoClient } from './jeko.client';
import { ApplicationPaiementService } from './application-paiement.service';

@Injectable()
export class ReconciliationService {
  private readonly journal = new Logger('Reconciliation');

  constructor(
    private readonly base: BaseService,
    private readonly jeko: JekoClient,
    private readonly application: ApplicationPaiementService,
  ) {}

  async executer(limite = 50): Promise<{ verifies: number; mis_a_jour: number }> {
    const maintenant = Date.now();
    // Clé secrète justifiée : tâche serveur sans utilisateur
    const { data: enAttente, error } = await this.base.admin
      .from('payments')
      .select('id, reference, provider_transaction_id')
      .eq('provider', 'jeko')
      .eq('status', 'pending')
      .not('provider_transaction_id', 'is', null)
      .lt('created_at', new Date(maintenant - 2 * 60_000).toISOString())
      .gt('created_at', new Date(maintenant - 24 * 3_600_000).toISOString())
      .order('created_at', { ascending: true })
      .limit(limite);
    if (error) throw error;

    let misAJour = 0;
    for (const p of enAttente ?? []) {
      try {
        const tx = await this.jeko.obtenirTransaction(p.provider_transaction_id!);
        const r = await this.application.appliquer(tx);
        if (r !== 'pending') misAJour++;
      } catch (e) {
        this.journal.warn(`Paiement ${p.reference} non vérifié : ${e instanceof Error ? e.message : e}`);
      }
    }
    return { verifies: enAttente?.length ?? 0, mis_a_jour: misAJour };
  }
}
