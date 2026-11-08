/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Devenir partenaire (inscription KYB)
 * Route : /devenir-partenaire    Application : vendeur (pro.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • 1. Type : agence de location, particulier loueur, concessionnaire, particulier vendeur
 *   • 2. Identité légale : raison sociale, RCCM, NCC (obligatoires pour les professionnels)
 *   • 3. Documents : RCCM, CNI du gérant, attestation d'assurance
 *   • 4. Compte de versement (utilisable 72 h après ajout)
 *   • 5. Suivi de validation
 *
 * DONNÉES
 *   • rpc become_partner
 *   • tables partner_private, partner_documents (bucket privé)
 *   • API POST /vendeur/versements/comptes (chiffrement)
 *
 * SÉCURITÉ
 *   • La page est accessible sans connexion (vitrine publique).
 *   • L'envoi du formulaire exige une session active :
 *     si l'utilisateur n'est pas connecté au moment de soumettre,
 *     il est redirigé vers /connexion?suite=/devenir-partenaire.
 *   • Badge « Vérifié » seulement après verify_partner par la modération.
 * ═══════════════════════════════════════════════════════════════════════════
 */
'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { clientNavigateur } from '@plateforme/supabase/navigateur';
import { cn } from '@plateforme/ui/utils';
import type { User } from '@supabase/supabase-js';

export default function PageDevenirPartenaire() {
  const supabase = clientNavigateur();
  const [utilisateur, setUtilisateur] = useState<User | null | undefined>(undefined);

  // Vérifier la session à l'hydratation (ne pas bloquer le rendu initial)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUtilisateur(data.user ?? null));
  }, [supabase]);

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    // Revérifier la session au moment de la soumission
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      window.location.href = '/connexion?suite=/devenir-partenaire';
      return;
    }
    // TODO : implémenter l'envoi du formulaire multi-étapes (rpc become_partner)
  };

  return (
    <div className="min-h-dvh bg-[var(--couleur-fond)]">
      <main className="mx-auto max-w-2xl px-6 py-14">
        {/* En-tête */}
        <header className="mb-10">
          <a href="/" className="mb-6 inline-flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)] focus-visible:outline-offset-2">
            <span className="grid size-9 place-items-center rounded-xl bg-[var(--couleur-primaire)] shadow-[var(--ombre-primaire)]" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" className="size-5 text-white">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-[var(--couleur-texte)]">
              Auto<span className="text-[var(--couleur-primaire)]">Mobile</span>{' '}
              <span className="font-normal text-[var(--couleur-texte-secondaire)]">Pro</span>
            </span>
          </a>
          <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.025em] text-[var(--couleur-texte)]">
            Devenir partenaire
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--couleur-texte-secondaire)]">
            Mettez vos véhicules en location ou à la vente sur AutoMobile CI.
            Rejoignez plus de 300 partenaires actifs en Côte d'Ivoire.
          </p>
        </header>

        {/* Formulaire multi-étapes (à développer) */}
        <form noValidate onSubmit={soumettre} className="flex flex-col gap-8">

          {/* Alerte connexion requise — affichée uniquement si l'utilisateur n'est pas connecté */}
          {utilisateur === null && (
            <div
              role="note"
              className="flex items-start gap-3 rounded-xl border border-[var(--couleur-primaire)]/20 bg-[var(--couleur-primaire-doux)] px-4 py-3.5 text-[13px] leading-relaxed text-[var(--couleur-texte)]"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-[var(--couleur-orange-accessible)]">
                <path d="M8 1.5a6.5 6.5 0 1 0 0 13A6.5 6.5 0 0 0 8 1.5ZM8 5v3.5M8 11v.1" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <span>
                Vous devez être{' '}
                <a href="/connexion?suite=/devenir-partenaire" className="font-medium text-[var(--couleur-orange-accessible)] underline hover:no-underline">
                  connecté
                </a>{' '}
                pour soumettre votre candidature.
              </span>
            </div>
          )}

          {/* Étape 1 — Type de partenariat */}
          <fieldset className="rounded-2xl border border-[var(--couleur-bordure)] p-5">
            <legend className="px-1 text-[13px] font-semibold text-[var(--couleur-texte)]">
              1. Type de partenariat
            </legend>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {[
                { value: 'agence_location', label: 'Agence de location' },
                { value: 'particulier_loueur', label: 'Particulier loueur' },
                { value: 'concessionnaire', label: 'Concessionnaire' },
                { value: 'particulier_vendeur', label: 'Particulier vendeur' },
              ].map(({ value, label }) => (
                <label key={value} className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-xl border border-[var(--couleur-bordure)] px-3.5 py-3 text-[13px] text-[var(--couleur-texte)] transition-[border-color] hover:border-[var(--couleur-primaire)]/50',
                  'has-[:checked]:border-[var(--couleur-primaire)] has-[:checked]:bg-[var(--couleur-primaire-doux)]',
                )}>
                  <input type="radio" name="type_partenariat" value={value} className="sr-only" />
                  <span className={cn(
                    'grid size-4 shrink-0 place-items-center rounded-full border-[1.5px] transition-colors',
                    'border-[var(--couleur-bordure)]',
                  )} aria-hidden="true" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Étapes suivantes — À développer */}
          <div className="rounded-2xl border border-dashed border-[var(--couleur-bordure)] px-5 py-6 text-center text-[13px] text-[var(--couleur-texte-faible)]">
            Étapes suivantes : identité légale, documents, compte de versement — en cours de développement.
          </div>

          {/* Bouton de soumission */}
          <button
            type="submit"
            className={cn(
              'flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--couleur-primaire)] text-[14px] font-semibold text-white shadow-[var(--ombre-primaire)] transition-all',
              'hover:bg-[var(--couleur-primaire-sombre)]',
              'focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)] focus-visible:outline-offset-2',
              'active:scale-[0.99]',
            )}
          >
            {utilisateur === undefined ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              'Soumettre ma candidature'
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
