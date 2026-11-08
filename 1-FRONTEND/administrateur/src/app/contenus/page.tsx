/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Contenus
 * Route : /contenus    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • FAQ, pages, documents légaux (versionnés)
 *
 * DONNÉES
 *   • tables faq_articles, cms_pages, legal_documents
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { clientServeur } from '@plateforme/supabase/serveur';
import { redirect } from 'next/navigation';

export default async function Page() {
  const supabase = await clientServeur();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/connexion');
  return null; // À développer
}
