/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTRÔLEUR · Vendeur · Photos d'annonce
 * Route : /vendeur/photos
 * ═══════════════════════════════════════════════════════════════════════════
 * CAHIER DES CHARGES
 *   Éditeur d'annonce fluide — ajouter des photos par glisser-déposer
 *
 * CONTENU
 *   • POST /vendeur/photos — reçoit une photo, la contrôle, la convertit et l'enregistre
 *   • DELETE /vendeur/photos/:id — supprime une photo (jeton du partenaire : RLS)
 *   • 1. controlerFichier('photo_vehicule') : type réel, 12 Mo max
 *   • 2. Conversion WebP + AVIF en 400 / 800 / 1600 px, suppression EXIF (GPS du téléphone)
 *   • 3. Empreinte perceptuelle (pHash 64 bits) + aperçu flou (blurhash)
 *   • 4. Envoi dans le bucket public vehicle-photos
 *   • 5. Insertion vehicle_photos avec le jeton du partenaire, puis perceptual_hash (déclenche l'agent photos copiées)
 *
 * SÉCURITÉ
 *   • Limite : 60 envois / heure
 *   • Un partenaire ne peut ajouter des photos qu'à SES véhicules (RLS)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Controller, NotImplementedException, Delete, Post } from '@nestjs/common';
import { Roles, UtilisateurCourant } from '../../noyau/auth/decorateurs';
import type { Utilisateur } from '../../noyau/auth/decorateurs';

@Roles('partner')
@Controller('vendeur/photos')
export class PhotosVendeurController {
  /** POST /vendeur/photos — reçoit une photo, la contrôle, la convertit et l'enregistre */
  @Post('')
  async envoyer(@UtilisateurCourant() _u: Utilisateur) {
    throw new NotImplementedException();
  }

  /** DELETE /vendeur/photos/:id — supprime une photo (jeton du partenaire : RLS) */
  @Delete(':id')
  async supprimer(@UtilisateurCourant() _u: Utilisateur) {
    throw new NotImplementedException();
  }
}
