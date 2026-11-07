/**
 * ═══════════════════════════════════════════════════════════════════
 * CLIENT DE LA PLATEFORME FNE (DGI Côte d'Ivoire)
 * ═══════════════════════════════════════════════════════════════════
 * ⚠ À DÉVELOPPER avec la documentation et les accès fournis par la DGI
 *   (identifiant contribuable, clé d'API, format des lignes de facture, TVA 18 %).
 * Seul fichier à modifier si le format FNE évolue.
 * ═══════════════════════════════════════════════════════════════════
 */
import { Injectable, NotImplementedException } from '@nestjs/common';
import { env } from '../../../noyau/config/env';

export interface ResultatFne {
  reference: string;
  urlQr: string;
}

@Injectable()
export class FneClient {
  estConfigure(): boolean {
    return Boolean(env.FNE_API_URL && env.FNE_API_KEY);
  }

  async certifier(_facture: Record<string, unknown>): Promise<ResultatFne> {
    throw new NotImplementedException('FNE_CLIENT_A_DEVELOPPER');
  }
}
