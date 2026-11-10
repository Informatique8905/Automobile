/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LAYOUT · Garde du back-office
 * Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Vérifie la session avec getUser()
 *   • Vérifie le rôle d'équipe et l'AAL via staff_mfa_status()
 *   • Affiche « Accès réservé à l'équipe » pour un compte client/partenaire
 *
 * SÉCURITÉ
 *   • Le proxy reste une protection de confort ; ce garde serveur est la
 *     barrière réelle pour les pages admin.*
 *   • staff_mfa_status() est security definer et ne reconnaît les rôles
 *     admin/moderator/support qu'avec une session aal2.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { clientServeur } from '@plateforme/supabase/serveur';

type StatutEquipe = {
  is_staff_account?: boolean;
  session_aal?: string;
  mfa_required?: boolean;
};

function AccesReserve() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--couleur-fond-doux)] p-4">
      <section className="w-full max-w-md rounded-2xl border border-[var(--couleur-bordure)] bg-[var(--couleur-fond)] p-8 text-center shadow-[var(--ombre-lg)]">
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--couleur-texte)]">
          Accès réservé à l'équipe
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--couleur-texte-secondaire)]">
          Ce compte ne fait pas partie de l'équipe de la plateforme. Si vous pensez qu'il s'agit d'une erreur, contactez le support.
        </p>
        <Link
          href="/connexion"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--couleur-texte)] px-5 text-[14px] font-semibold text-white shadow-[var(--ombre)] transition-colors hover:bg-[var(--couleur-texte-secondaire)] focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)] focus-visible:outline-offset-2"
        >
          Retour à la connexion
        </Link>
      </section>
    </main>
  );
}

export default async function LayoutBackOffice({ children }: { children: ReactNode }) {
  const supabase = await clientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/connexion');

  const { data: statut, error } = await supabase.rpc('staff_mfa_status');
  if (error) return <AccesReserve />;

  const equipe = statut as StatutEquipe | null;
  const autorise =
    equipe?.is_staff_account === true &&
    equipe.session_aal === 'aal2' &&
    equipe.mfa_required !== true;

  if (!autorise) return <AccesReserve />;

  return <>{children}</>;
}
