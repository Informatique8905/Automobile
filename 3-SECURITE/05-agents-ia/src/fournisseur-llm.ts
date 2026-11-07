/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FOURNISSEUR DE MODÈLE IA (interchangeable)
 * ─────────────────────────────────────────────────────────────────────────────
 * Une seule interface `FournisseurLLM` : changer de fournisseur = écrire une
 * nouvelle classe, sans toucher aux agents. Implémentation fournie : API Messages
 * d'Anthropic, appelée en HTTP (pas de SDK, moins de dépendances).
 *
 * COÛT : renseigner LLM_PRIX_ENTREE_USD_PAR_MTOK et LLM_PRIX_SORTIE_USD_PAR_MTOK
 * (tarifs publiés par le fournisseur pour le modèle choisi). Sans eux, le coût
 * n'est pas calculé et le budget quotidien de `ai_agents` ne peut pas s'appliquer.
 *
 * DONNÉES : aucune pièce d'identité, aucun permis, aucun selfie n'est envoyé ici.
 * Ces images vont uniquement au fournisseur KYC (voir 3-SECURITE/03).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { FournisseurLLM, RequeteLLM, ReponseLLM } from './types.ts';

export class FournisseurAnthropic implements FournisseurLLM {
  readonly nom = 'anthropic';
  private readonly cleApi: string;
  private readonly prixEntreeParMTok: number | null;
  private readonly prixSortieParMTok: number | null;
  private readonly delaiMs: number;

  constructor(cleApi: string, prixEntreeParMTok: number | null = null, prixSortieParMTok: number | null = null, delaiMs = 20_000) {
    if (!cleApi) throw new Error('LLM_API_KEY manquante');
    this.cleApi = cleApi;
    this.prixEntreeParMTok = prixEntreeParMTok;
    this.prixSortieParMTok = prixSortieParMTok;
    this.delaiMs = delaiMs;
  }

  async analyser(r: RequeteLLM): Promise<ReponseLLM> {
    const contenu: unknown[] = [
      ...(r.images ?? []).slice(0, 5).map((url) => ({ type: 'image', source: { type: 'url', url } })),
      { type: 'text', text: r.message },
    ];

    const controle = new AbortController();
    const minuterie = setTimeout(() => controle.abort(), this.delaiMs);
    try {
      const rep = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controle.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.cleApi,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: r.modele,
          max_tokens: r.maxTokens ?? 400,
          temperature: 0,
          system: r.systeme,
          messages: [{ role: 'user', content: contenu }],
        }),
      });
      if (!rep.ok) throw new Error(`LLM_HTTP_${rep.status}`);
      const json = (await rep.json()) as {
        content?: Array<{ type: string; text?: string }>;
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      const texte = (json.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('');
      const tokensEntree = json.usage?.input_tokens ?? 0;
      const tokensSortie = json.usage?.output_tokens ?? 0;
      const coutUsd =
        this.prixEntreeParMTok !== null && this.prixSortieParMTok !== null
          ? (tokensEntree * this.prixEntreeParMTok + tokensSortie * this.prixSortieParMTok) / 1_000_000
          : null;
      return { texte, tokensEntree, tokensSortie, coutUsd };
    } finally {
      clearTimeout(minuterie);
    }
  }
}

/** Fournisseur factice pour les tests et le mode développement (aucun appel réseau). */
export class FournisseurFactice implements FournisseurLLM {
  readonly nom = 'factice';
  private readonly reponse: string;
  constructor(reponse: string) {
    this.reponse = reponse;
  }
  async analyser(): Promise<ReponseLLM> {
    return { texte: this.reponse, tokensEntree: 0, tokensSortie: 0, coutUsd: 0 };
  }
}
