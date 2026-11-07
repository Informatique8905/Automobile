/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CONTRÔLE DES FICHIERS ENVOYÉS (photos de véhicules, permis, pièces d'identité)
 * ─────────────────────────────────────────────────────────────────────────────
 * RÔLE
 *   Ne jamais faire confiance à l'extension ni au type annoncé par le navigateur :
 *   on lit les premiers octets du fichier (« nombre magique ») pour connaître son
 *   vrai type. Un fichier .jpg qui est en réalité un script est refusé.
 *
 * RÈGLES
 *   - Photos : JPEG, PNG, WebP, HEIC (iPhone) ; 12 Mo max avant compression.
 *   - Documents KYC : JPEG, PNG, PDF ; 8 Mo max ; bucket PRIVÉ uniquement.
 *   - Les métadonnées EXIF (position GPS du téléphone !) sont supprimées par l'API
 *     lors de la conversion en WebP — sauf pour les états des lieux, où l'heure et
 *     le lieu servent de preuve et sont conservés à part, côté serveur.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type TypeReel = 'jpeg' | 'png' | 'webp' | 'heic' | 'pdf' | 'inconnu';

export function detecterTypeReel(debut: Uint8Array): TypeReel {
  const b = debut;
  const egal = (offset: number, octets: number[]) => octets.every((v, i) => b[offset + i] === v);

  if (egal(0, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (egal(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (egal(0, [0x52, 0x49, 0x46, 0x46]) && egal(8, [0x57, 0x45, 0x42, 0x50])) return 'webp';
  if (egal(4, [0x66, 0x74, 0x79, 0x70])) {
    const marque = String.fromCharCode(...b.slice(8, 12));
    if (['heic', 'heix', 'mif1', 'msf1', 'hevc'].includes(marque)) return 'heic';
  }
  if (egal(0, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf';
  return 'inconnu';
}

export const REGLES_FICHIERS = {
  photo_vehicule: { types: ['jpeg', 'png', 'webp', 'heic'] as TypeReel[], tailleMaxOctets: 12 * 1024 * 1024 },
  etat_des_lieux: { types: ['jpeg', 'png', 'webp', 'heic'] as TypeReel[], tailleMaxOctets: 12 * 1024 * 1024 },
  document_identite: { types: ['jpeg', 'png', 'pdf'] as TypeReel[], tailleMaxOctets: 8 * 1024 * 1024 },
  document_partenaire: { types: ['jpeg', 'png', 'pdf'] as TypeReel[], tailleMaxOctets: 8 * 1024 * 1024 },
} as const;

export type UsageFichier = keyof typeof REGLES_FICHIERS;

export type ResultatControle =
  | { accepte: true; type: TypeReel }
  | { accepte: false; raison: 'FICHIER_TROP_LOURD' | 'TYPE_NON_AUTORISE' | 'FICHIER_VIDE' };

export function controlerFichier(usage: UsageFichier, contenu: Uint8Array): ResultatControle {
  const regle = REGLES_FICHIERS[usage];
  if (contenu.byteLength === 0) return { accepte: false, raison: 'FICHIER_VIDE' };
  if (contenu.byteLength > regle.tailleMaxOctets) return { accepte: false, raison: 'FICHIER_TROP_LOURD' };
  const type = detecterTypeReel(contenu.subarray(0, 16));
  if (!regle.types.includes(type)) return { accepte: false, raison: 'TYPE_NON_AUTORISE' };
  return { accepte: true, type };
}
