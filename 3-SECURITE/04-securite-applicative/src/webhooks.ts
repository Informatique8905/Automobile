/**
 * ─────────────────────────────────────────────────────────────────────────────
 * VÉRIFICATION DES WEBHOOKS SIGNÉS (Jeko, fournisseur KYC…)
 * ─────────────────────────────────────────────────────────────────────────────
 * RÔLE
 *   Prouver qu'un appel reçu vient bien du prestataire et n'a pas été modifié.
 *   Sans cette vérification, n'importe qui pourrait envoyer « paiement réussi ».
 *
 * RÈGLES
 *   1. Calculer la signature sur le CORPS BRUT reçu (octets exacts), jamais sur
 *      un JSON re-sérialisé.
 *   2. Comparer en temps constant (timingSafeEqual) : pas d'indice par la durée.
 *   3. Refuser un horodatage trop ancien (rejeu d'un vieux webhook valide).
 *   4. Même signé, un webhook ne fait que DÉCLENCHER une vérification : le
 *      montant est recontrôlé dans la base (handle_jeko_payment_success).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface OptionsVerification {
  /** Corps brut de la requête, tel que reçu */
  corpsBrut: Buffer | string;
  /** Valeur de l'en-tête de signature envoyée par le prestataire */
  signatureRecue: string | undefined;
  /** Secret partagé fourni par le prestataire */
  secret: string;
  /** Algorithme (sha256 par défaut) */
  algorithme?: 'sha256' | 'sha512';
  /** Encodage de la signature envoyée */
  encodage?: 'hex' | 'base64';
  /** Horodatage envoyé par le prestataire (secondes Unix), si fourni */
  horodatage?: string | number;
  /** Tolérance pour l'horodatage (secondes) */
  toleranceSecondes?: number;
  /** Préfixe éventuel de la signature, ex. « sha256= » */
  prefixe?: string;
  /** Si le prestataire signe « horodatage.corps » au lieu du corps seul */
  signerAvecHorodatage?: boolean;
}

export type ResultatVerification =
  | { valide: true }
  | { valide: false; raison: 'SIGNATURE_ABSENTE' | 'SECRET_ABSENT' | 'HORODATAGE_EXPIRE' | 'SIGNATURE_INVALIDE' };

export function verifierSignatureHmac(o: OptionsVerification): ResultatVerification {
  if (!o.secret) return { valide: false, raison: 'SECRET_ABSENT' };
  if (!o.signatureRecue) return { valide: false, raison: 'SIGNATURE_ABSENTE' };

  if (o.horodatage !== undefined) {
    const t = Number(o.horodatage);
    const tolerance = o.toleranceSecondes ?? 300;
    if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > tolerance) {
      return { valide: false, raison: 'HORODATAGE_EXPIRE' };
    }
  }

  const corps = typeof o.corpsBrut === 'string' ? Buffer.from(o.corpsBrut, 'utf8') : o.corpsBrut;
  const aSigner = o.signerAvecHorodatage && o.horodatage !== undefined
    ? Buffer.concat([Buffer.from(`${o.horodatage}.`, 'utf8'), corps])
    : corps;

  const encodage = o.encodage ?? 'hex';
  const attendue = createHmac(o.algorithme ?? 'sha256', o.secret).update(aSigner).digest();

  let recue = o.signatureRecue.trim();
  if (o.prefixe && recue.startsWith(o.prefixe)) recue = recue.slice(o.prefixe.length);

  let recueOctets: Buffer;
  try {
    recueOctets = Buffer.from(recue, encodage);
  } catch {
    return { valide: false, raison: 'SIGNATURE_INVALIDE' };
  }

  if (recueOctets.length !== attendue.length || !timingSafeEqual(recueOctets, attendue)) {
    return { valide: false, raison: 'SIGNATURE_INVALIDE' };
  }
  return { valide: true };
}

/** Comparaison de deux secrets en temps constant (ex. en-tête X-Cron-Secret). */
export function secretsEgaux(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
