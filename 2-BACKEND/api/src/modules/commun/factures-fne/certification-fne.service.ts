/**
 * ═══════════════════════════════════════════════════════════════════
 * CERTIFICATION DES FACTURES (FNE — Direction générale des impôts)
 * ═══════════════════════════════════════════════════════════════════
 * Toutes les 5 min : réclame les factures « pending » / « failed » (claim_invoices_for_fne),
 * les envoie à la plateforme FNE, enregistre la référence et le QR de certification
 * (record_fne_result), puis génère le PDF final dans le bucket privé « invoices ».
 * Le client ne peut télécharger une facture qu'une fois certifiée.
 * À VALIDER avec un expert-comptable : émetteur (plateforme ou loueur) et montant facturé.
 * ═══════════════════════════════════════════════════════════════════
 */
import { Injectable, Logger } from '@nestjs/common';
import { BaseService } from '../../../noyau/base/supabase.service';
import { FneClient } from './fne.client';

@Injectable()
export class CertificationFneService {
  private readonly journal = new Logger('FNE');

  constructor(
    private readonly base: BaseService,
    private readonly fne: FneClient,
  ) {}

  async certifierEnAttente(limite = 20) {
    if (!this.fne.estConfigure()) return 'fne_non_configure';
    // Clé secrète justifiée : tâche serveur sans utilisateur
    const { data: factures, error } = await this.base.admin.rpc('claim_invoices_for_fne', { p_limit: limite });
    if (error) throw error;

    let certifiees = 0;
    for (const f of (factures ?? []) as Array<Record<string, any>>) {
      try {
        const r = await this.fne.certifier(f);
        await this.base.admin.rpc('record_fne_result', {
          p_invoice_id: f.id, p_success: true, p_reference: r.reference, p_qr_url: r.urlQr,
        });
        certifiees++;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        this.journal.warn(`Facture ${f.number} non certifiée : ${message}`);
        await this.base.admin.rpc('record_fne_result', { p_invoice_id: f.id, p_success: false, p_error: message });
      }
    }
    return { reclamees: factures?.length ?? 0, certifiees };
  }
}
