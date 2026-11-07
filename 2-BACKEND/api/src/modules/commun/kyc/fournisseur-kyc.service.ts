/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVICE · Fournisseur de vérification d'identité
 * ═══════════════════════════════════════════════════════════════════════════
 * Choix du fournisseur à faire : couverture CNI ivoirienne + permis, vivacité, prix, lieu d'hébergement des données.
 *
 * CONTENU
 *   • creerSession(utilisateur) → URL / jeton du fournisseur
 *   • Interprète le résultat : document authentique, visage = selfie, vivacité, âge
 *
 * SÉCURITÉ
 *   • Les images vont au fournisseur KYC, jamais au modèle IA
 *   • Contrat : pas de réutilisation des données, suppression après traitement
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Injectable } from '@nestjs/common';

@Injectable()
export class FournisseurKycService {
  // À développer
}
