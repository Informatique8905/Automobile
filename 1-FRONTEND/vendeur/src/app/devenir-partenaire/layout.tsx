/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LAYOUT · Devenir partenaire — garde d'authentification (côté serveur)
 * ═══════════════════════════════════════════════════════════════════════════
 * Redirige vers /connexion si l'utilisateur n'est pas connecté.
 * S'exécute avant le rendu de page.tsx ('use client').
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { clientServeur } from '@plateforme/supabase/serveur';
import { redirect } from 'next/navigation';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = await clientServeur();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/connexion?suite=/devenir-partenaire');
  return <>{children}</>;
}
