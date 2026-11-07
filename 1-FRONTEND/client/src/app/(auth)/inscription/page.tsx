/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Inscription
 * Route : /inscription    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CAHIER DES CHARGES
 *   Page d'inscription
 *
 * CONTENU
 *   • Nom, prénoms, e-mail ou téléphone, mot de passe, adresse (commune / quartier), téléphone
 *   • Continuer avec Google / Apple
 *   • Cases à cocher : CGU + confidentialité (obligatoires), marketing (facultatif)
 *
 * DONNÉES
 *   • Supabase Auth signUp / signInWithOtp (téléphone) / signInWithOAuth
 *   • table consents (preuve horodatée)
 *
 * SÉCURITÉ
 *   • CAPTCHA
 *   • Mot de passe : 10 caractères minimum
 *   • Le profil est créé par la base (trigger), pas par le navigateur
 *
 * À FAIRE
 *   [ ] Proposer d'abord « Continuer avec mon numéro » (code SMS / WhatsApp)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export default function Page() {
  return null; // À développer
}
