/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Notifications et préférences
 * Route : /compte/notifications    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Centre de notifications
 *   • Préférences par canal (in-app, e-mail, SMS, WhatsApp, push) et catégorie
 *
 * DONNÉES
 *   • tables notifications, notification_preferences, push_subscriptions
 *
 * SÉCURITÉ
 *   • Les alertes de sécurité ne sont pas désactivables
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
