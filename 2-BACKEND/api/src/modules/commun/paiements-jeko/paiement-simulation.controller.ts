/**
 * PAGE DE TEST DU PAIEMENT SIMULÉ — /paiement-test/:transactionId
 * ═══════════════════════════════════════════════════════════════════
 * Accessible uniquement quand PAIEMENT_MODE=simulation.
 * L'utilisateur choisit « réussi », « échoué » ou « abandonné » ; le choix
 * marque la transaction puis envoie un webhook SIGNÉ vers /webhooks/jeko,
 * exactement comme le ferait Jeko. Le traitement (montant, idempotence,
 * confirmation) reste celui du vrai chemin.
 * ═══════════════════════════════════════════════════════════════════
 */
import { Controller, Get, Header, NotFoundException, Param, Post, Body } from '@nestjs/common';
import { createHmac, randomUUID } from 'node:crypto';
import { env } from '../../../noyau/config/env';
import { Public } from '../../../noyau/auth/decorateurs';
import { PaiementSimulationService, type ResultatTest } from './paiement-simulation.service';

const RESULTATS: ResultatTest[] = ['succes', 'echec', 'abandon'];

function page(titre: string, contenu: string): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titre}</title>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100dvh;margin:0;background:#f9fafb;color:#111827}main{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;max-width:420px;width:100%;box-shadow:0 10px 15px -3px rgb(0 0 0/.1)}h1{font-size:20px;margin:0 0 8px}p{color:#4b5563;font-size:14px;line-height:1.5}.montant{font-size:28px;font-weight:700;margin:16px 0}button{display:block;width:100%;margin-top:10px;padding:12px;border:0;border-radius:12px;font-weight:600;cursor:pointer}.ok{background:#ff6b00;color:#111827}.ko{background:#111827;color:#fff}.ab{background:#f3f4f6;color:#111827}.note{font-size:12px;color:#9ca3af;margin-top:16px}</style></head><body><main>${contenu}</main></body></html>`;
}

@Controller('paiement-test')
export class PaiementSimulationController {
  constructor(private readonly simulation: PaiementSimulationService) {}

  private verifierMode() {
    if (env.PAIEMENT_MODE !== 'simulation') throw new NotFoundException();
  }

  @Public()
  @Get(':transactionId')
  @Header('Content-Type', 'text/html; charset=utf-8')
  pageTest(@Param('transactionId') transactionId: string) {
    this.verifierMode();
    const tx = this.simulation.decrire(transactionId);
    if (!tx) throw new NotFoundException();
    const statut = tx.statut === 'en_attente' ? 'En attente de votre choix' : `Statut : ${tx.statut}`;
    const formulaire = tx.statut === 'en_attente'
      ? `<form method="post" action="/paiement-test/${encodeURIComponent(transactionId)}/resultat">
           <input type="hidden" name="resultat" value="succes"><button class="ok" type="submit">Paiement réussi</button></form>
         <form method="post" action="/paiement-test/${encodeURIComponent(transactionId)}/resultat">
           <input type="hidden" name="resultat" value="echec"><button class="ko" type="submit">Paiement échoué</button></form>
         <form method="post" action="/paiement-test/${encodeURIComponent(transactionId)}/resultat">
           <input type="hidden" name="resultat" value="abandon"><button class="ab" type="submit">Paiement abandonné</button></form>`
      : '';
    return page('Paiement simulé', `
      <h1>Paiement simulé</h1>
      <p>${statut}</p>
      <p class="montant">${tx.montant.toLocaleString('fr-FR')} FCFA</p>
      <p>Référence : ${tx.referenceMarchand}</p>
      ${formulaire}
      <p class="note">Mode test : aucun argent réel. Le webhook signé suit le même chemin que Jeko.</p>`);
  }

  @Public()
  @Post(':transactionId/resultat')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async choisir(@Param('transactionId') transactionId: string, @Body() corps: Record<string, unknown>) {
    this.verifierMode();
    const resultat = String(corps?.resultat ?? '') as ResultatTest;
    if (!RESULTATS.includes(resultat)) throw new NotFoundException();
    if (!this.simulation.resultat(transactionId, resultat)) {
      return page('Paiement simulé', '<h1>Transaction introuvable ou déjà traitée</h1><p>Revenez à la plateforme : le statut réel est lu dans la base.</p>');
    }

    // Webhook signé, même chemin que Jeko : le contrôleur re-vérifie la signature,
    // journalise l'événement puis demande le statut au fournisseur (ici la simulation).
    const corpsBrut = JSON.stringify({
      id: `sim_evt_${randomUUID()}`,
      transaction_id: transactionId,
      type: `payment.${resultat}`,
      data: { id: transactionId },
    });
    const horodatage = Math.floor(Date.now() / 1000).toString();
    const signature = createHmac('sha256', env.PAIEMENT_SIMULATION_SECRET ?? '')
      .update(corpsBrut)
      .digest('hex');

    let webhookOk = true;
    try {
      const controle = new AbortController();
      const minuteur = setTimeout(() => controle.abort(), 10_000);
      const rep = await fetch(`${env.API_PUBLIC_URL}/webhooks/jeko`, {
        method: 'POST',
        signal: controle.signal,
        headers: {
          'content-type': 'application/json',
          'jeko-signature': signature,
          'jeko-timestamp': horodatage,
        },
        body: corpsBrut,
      });
      clearTimeout(minuteur);
      webhookOk = rep.ok;
    } catch {
      webhookOk = false; // la réconciliation rattrapera via obtenirTransaction()
    }

    const libelle = resultat === 'succes' ? 'réussi' : resultat === 'echec' ? 'échoué' : 'abandonné';
    return page('Paiement simulé', `
      <h1>Paiement ${libelle}</h1>
      <p>Vous pouvez revenir à la plateforme : le statut est lu dans la base, jamais dans cette page.</p>
      <p class="note">${webhookOk ? 'Webhook signé envoyé.' : 'Webhook non délivré : la réconciliation appliquera le résultat.'}</p>`);
  }
}
