/**
 * ═══════════════════════════════════════════════════════════════════
 * CHIFFREMENT APPLICATIF — numéros de compte de versement (Mobile Money, banque)
 * ═══════════════════════════════════════════════════════════════════
 * AES-256-GCM (chiffrement + intégrité). La base ne reçoit que :
 *   account_ciphertext = « v1.<iv>.<tag>.<données> » (base64url)
 *   account_last4      = 4 derniers caractères, pour l'affichage
 * La clé (PAYOUT_ENCRYPTION_KEY) ne vit que sur Render. Une fuite de la base seule
 * ne révèle aucun numéro de versement. Préfixe de version : permet de changer de
 * clé plus tard (v2) sans casser les anciens enregistrements.
 * ═══════════════════════════════════════════════════════════════════
 */
import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../../../noyau/config/env';

@Injectable()
export class ChiffrementService {
  private readonly cle = Buffer.from(env.PAYOUT_ENCRYPTION_KEY, 'base64');

  chiffrer(texte: string): { ciphertext: string; last4: string } {
    const iv = randomBytes(12);
    const c = createCipheriv('aes-256-gcm', this.cle, iv);
    const donnees = Buffer.concat([c.update(texte, 'utf8'), c.final()]);
    const tag = c.getAuthTag();
    const enc = (b: Buffer) => b.toString('base64url');
    return { ciphertext: `v1.${enc(iv)}.${enc(tag)}.${enc(donnees)}`, last4: texte.replace(/\s/g, '').slice(-4) };
  }

  dechiffrer(ciphertext: string): string {
    const [version, iv, tag, donnees] = ciphertext.split('.');
    if (version !== 'v1' || !iv || !tag || !donnees) throw new Error('CIPHERTEXT_INVALIDE');
    const d = createDecipheriv('aes-256-gcm', this.cle, Buffer.from(iv, 'base64url'));
    d.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([d.update(Buffer.from(donnees, 'base64url')), d.final()]).toString('utf8');
  }
}
