/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Profil public d'un partenaire
 * Route : /partenaires/[slug]    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Logo, description, badge Vérifié / Super hôte, agences (carte), annonces, avis
 *
 * DONNÉES
 *   • table partners (colonnes publiques uniquement)
 *   • table partner_locations (agences publiques)
 *   • table reviews
 *
 * SÉCURITÉ
 *   • partner_private (RCCM, contacts, commission) n'est jamais lu ici
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return null; // À développer
}
