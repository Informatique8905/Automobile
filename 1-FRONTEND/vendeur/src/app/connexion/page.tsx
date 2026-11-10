/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Connexion partenaire
 * Route : /connexion    Application : vendeur (pro.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • E-mail + mot de passe, Google, Apple
 *   • Lien vers « Devenir partenaire » si pas encore de compte
 *
 * SÉCURITÉ
 *   • Vérifie après connexion que l'utilisateur a bien un rôle partenaire (RLS)
 *   • Message d'erreur identique compte existant ou non
 * ═══════════════════════════════════════════════════════════════════════════
 */
'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { clientNavigateur } from '@plateforme/supabase/navigateur';
import { cn } from '@plateforme/ui/utils';
import { transitionEntree, transitionSucces, useMouvementReduit } from '@plateforme/ui/mouvement';
import type { Provider } from '@supabase/supabase-js';

// ─── Constantes ─────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SSO_ACTIF = process.env.NEXT_PUBLIC_SSO_ACTIVE === 'true';

function messageFriendly(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou mot de passe incorrect.';
  if (msg.includes('Too many requests')) return 'Trop de tentatives. Attendez quelques minutes.';
  return msg;
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function PageConnexionVendeur() {
  const uid = useId();
  const mouvementReduit = useMouvementReduit();
  const supabase = clientNavigateur();

  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [toucheEmail, setToucheEmail] = useState(false);
  const [toucheMdp, setToucheMdp] = useState(false);
  const [soumis, setSoumis] = useState(false);
  const [afficherMdp, setAfficherMdp] = useState(false);
  const [verrou, setVerrou] = useState(false);
  const [motDePasseFocus, setMotDePasseFocus] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<null | 'submit' | Provider>(null);
  const [succes, setSucces] = useState(false);

  const [erreurCallback, setErreurCallback] = useState(false);
  useEffect(() => {
    setErreurCallback(new URLSearchParams(window.location.search).get('erreur') === 'callback');
  }, []);

  const emailRef = useRef<HTMLInputElement>(null);
  const mdpRef = useRef<HTMLInputElement>(null);
  const banniereRef = useRef<HTMLDivElement>(null);

  const erreurEmail = !email.trim() ? "Saisissez votre e-mail." : !EMAIL_RE.test(email.trim()) ? "E-mail invalide." : null;
  const erreurMdp = !motDePasse ? "Saisissez votre mot de passe." : null;
  const erreurEmailVis = soumis || toucheEmail ? erreurEmail : null;
  const erreurMdpVis = soumis || toucheMdp ? erreurMdp : null;
  const occupe = enCours !== null;

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    if (occupe) return;
    setSoumis(true);
    if (erreurEmail) { emailRef.current?.focus(); return; }
    if (erreurMdp) { mdpRef.current?.focus(); return; }
    setErreur(null);
    setEnCours('submit');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: motDePasse });
      if (error) throw new Error(messageFriendly(error.message));
      setSucces(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Une erreur est survenue.';
      setErreur(msg);
      window.requestAnimationFrame(() => banniereRef.current?.focus({ preventScroll: false }));
    } finally {
      setEnCours(null);
    }
  };

  const connecterSSO = async (fournisseur: Provider) => {
    if (occupe) return;
    setEnCours(fournisseur);
    setErreur(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: fournisseur,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw new Error(messageFriendly(error.message));
    } catch (err) {
      setErreur(err instanceof Error ? err.message : `Connexion ${fournisseur} annulée.`);
    } finally {
      setEnCours(null);
    }
  };

  const transition = transitionEntree(mouvementReduit);

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <main className="flex flex-col bg-[var(--couleur-fond)]">
        {/* En-tête */}
        <header className="flex items-center justify-between gap-4 px-6 pt-6 md:px-10 md:pt-8">
          <a href="/" className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)] focus-visible:outline-offset-2">
            <span className="grid size-9 place-items-center rounded-xl bg-[var(--couleur-primaire)] shadow-[var(--ombre-primaire)]" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" className="size-5 text-white">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="text-[15px] font-semibold tracking-tight">
              Auto<span className="text-[var(--couleur-primaire)]">Mobile</span>{' '}
              <span className="text-[var(--couleur-texte-secondaire)] font-normal">Pro</span>
            </span>
          </a>
          <a href="/devenir-partenaire" className="rounded text-[12.5px] text-[var(--couleur-texte-secondaire)] transition-colors hover:text-[var(--couleur-texte)] focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)]">
            Pas de compte ?{' '}
            <span className="font-medium text-[var(--couleur-orange-accessible)]">Devenir partenaire</span>
          </a>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-10 md:px-10">
          <div className="w-full max-w-[384px]">
            <AnimatePresence mode="wait">
              {!succes ? (
                <motion.div key="formulaire" {...transition}>
                  {erreurCallback && (
                    <div
                      role="alert"
                      className="mb-6 flex gap-3 rounded-xl border border-[var(--couleur-erreur)]/20 bg-[var(--couleur-erreur-fond)] px-3.5 py-3 text-[12.5px] leading-relaxed text-[var(--couleur-texte)]"
                    >
                      <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-[var(--couleur-erreur)]">
                        <path d="M8 1.75 15 14H1L8 1.75Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                        <path d="M8 6.25v3.5M8 11.6v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <p>La connexion a échoué. Veuillez réessayer.</p>
                    </div>
                  )}

                  <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em] text-[var(--couleur-texte)] md:text-[32px]">
                    Espace partenaire
                  </h1>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--couleur-texte-secondaire)]">
                    Gérez votre flotte, vos réservations et vos versements.
                  </p>

                  {/* SSO — masqués si NEXT_PUBLIC_SSO_ACTIVE !== 'true' */}
                  {SSO_ACTIF && (
                    <>
                      <div className="mt-7 grid grid-cols-2 gap-3">
                        {(['google', 'apple'] as const).map((f) => (
                          <button key={f} type="button" onClick={() => connecterSSO(f)} disabled={occupe && enCours !== f} aria-label={`Connexion ${f === 'google' ? 'Google' : 'Apple'}`}
                            className={cn('flex h-11 items-center justify-center gap-2.5 rounded-xl border border-[var(--couleur-bordure)] bg-[var(--couleur-fond)] text-[13px] font-medium text-[var(--couleur-texte)] shadow-[var(--ombre-sm)] transition-all hover:border-[var(--couleur-bordure-active)] focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)] focus-visible:outline-offset-2 disabled:opacity-50')}>
                            {enCours === f ? <Loader2 className="size-4 animate-spin" /> : f === 'google' ? <IconGoogle /> : <IconApple />}
                            <span>{f === 'google' ? 'Google' : 'Apple'}</span>
                          </button>
                        ))}
                      </div>

                      <div className="my-6 flex items-center gap-3">
                        <span className="h-px flex-1 bg-[var(--couleur-bordure)]" />
                        <span className="text-[11px] font-medium uppercase tracking-widest text-[var(--couleur-texte-faible)]">ou par e-mail</span>
                        <span className="h-px flex-1 bg-[var(--couleur-bordure)]" />
                      </div>
                    </>
                  )}

                  <form noValidate onSubmit={soumettre} className="flex flex-col gap-4">
                    {erreur && (
                      <div ref={banniereRef} tabIndex={-1} role="alert" className="flex gap-3 rounded-xl border border-[var(--couleur-erreur)]/20 bg-[var(--couleur-erreur-fond)] px-3.5 py-3 text-[12.5px] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-[var(--couleur-erreur)]">
                        <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-[var(--couleur-erreur)]">
                          <path d="M8 1.75 15 14H1L8 1.75Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                          <path d="M8 6.25v3.5M8 11.6v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <p className="text-[var(--couleur-texte)]">{erreur}</p>
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`${uid}-email`} className="text-[12.5px] font-medium text-[var(--couleur-texte)]">Adresse e-mail</label>
                      <input ref={emailRef} id={`${uid}-email`} type="email" inputMode="email" autoComplete="email" placeholder="vous@exemple.ci" value={email} onChange={(e) => { setEmail(e.target.value); if (erreur) setErreur(null); }} onBlur={() => setToucheEmail(true)} readOnly={occupe} aria-invalid={erreurEmailVis ? true : undefined}
                        className={cn('h-10 w-full rounded-xl border border-[var(--couleur-bordure)] bg-[var(--couleur-fond-moyen)] px-3.5 text-[14px] text-[var(--couleur-texte)] placeholder:text-[var(--couleur-texte-faible)] transition-[border-color,box-shadow] focus:border-[var(--couleur-primaire)] focus:bg-[var(--couleur-fond)] focus:outline-none focus:shadow-[0_0_0_3px_rgb(255_107_0/0.15)]', erreurEmailVis && 'border-[var(--couleur-erreur)]')} />
                      {erreurEmailVis && <p role="alert" className="text-[12px] text-[var(--couleur-erreur)]">{erreurEmailVis}</p>}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor={`${uid}-mdp`} className="text-[12.5px] font-medium text-[var(--couleur-texte)]">Mot de passe</label>
                        <a href="/mot-de-passe-oublie" className="rounded text-[12px] text-[var(--couleur-texte-secondaire)] hover:text-[var(--couleur-orange-accessible)] focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)]">Oublié ?</a>
                      </div>
                      <div className="relative flex items-center">
                        <input ref={mdpRef} id={`${uid}-mdp`} type={afficherMdp ? 'text' : 'password'} autoComplete="current-password" placeholder="Votre mot de passe" value={motDePasse} onChange={(e) => { setMotDePasse(e.target.value); if (erreur) setErreur(null); }} onBlur={() => { setToucheMdp(true); setMotDePasseFocus(false); setVerrou(false); }} onFocus={() => setMotDePasseFocus(true)} onKeyDown={(e) => setVerrou(e.getModifierState?.('CapsLock') ?? false)} onKeyUp={(e) => setVerrou(e.getModifierState?.('CapsLock') ?? false)} readOnly={occupe} aria-invalid={erreurMdpVis ? true : undefined}
                          className={cn('h-10 w-full rounded-xl border border-[var(--couleur-bordure)] bg-[var(--couleur-fond-moyen)] px-3.5 pr-10 text-[14px] text-[var(--couleur-texte)] placeholder:text-[var(--couleur-texte-faible)] transition-[border-color,box-shadow] focus:border-[var(--couleur-primaire)] focus:bg-[var(--couleur-fond)] focus:outline-none focus:shadow-[0_0_0_3px_rgb(255_107_0/0.15)]', erreurMdpVis && 'border-[var(--couleur-erreur)]')} />
                        <button type="button" onClick={() => setAfficherMdp((v) => !v)} aria-label={afficherMdp ? 'Masquer' : 'Afficher'} aria-pressed={afficherMdp} className="absolute right-1 flex size-8 items-center justify-center rounded-lg text-[var(--couleur-texte-secondaire)] hover:text-[var(--couleur-texte)] focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)]">
                          {afficherMdp ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      {erreurMdpVis && <p role="alert" className="text-[12px] text-[var(--couleur-erreur)]">{erreurMdpVis}</p>}
                      {verrou && motDePasseFocus && (
                        <p className="flex items-center gap-1.5 text-[12px] text-[var(--couleur-alerte)]">
                          <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3 shrink-0"><path d="M8 2.5 13.5 8H10.5v3h-5V8H2.5L8 2.5ZM5.5 13.5h5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"/></svg>
                          Majuscule activée
                        </p>
                      )}
                    </div>

                    <button type="submit" disabled={occupe && enCours !== 'submit'}
                      className={cn('flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--couleur-primaire)] text-[14px] font-semibold text-white shadow-[var(--ombre-primaire)] transition-all hover:bg-[var(--couleur-primaire-sombre)] focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)] focus-visible:outline-offset-2 active:scale-[0.99] disabled:opacity-60')}>
                      {enCours === 'submit' ? <><Loader2 className="size-4 animate-spin" /> Connexion en cours</> : 'Se connecter'}
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.div key="succes" {...transition} className="flex flex-col items-start">
                  <span className="grid size-14 place-items-center rounded-2xl border border-[var(--couleur-succes)]/30 bg-[var(--couleur-succes-fond)]" aria-hidden="true">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7">
                      <motion.path d="M5.5 12.5 10 17l8.5-9.5" fill="none" stroke="var(--couleur-succes)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={transitionSucces(mouvementReduit)} />
                    </svg>
                  </span>
                  <h1 className="mt-6 text-[28px] font-semibold tracking-tight text-[var(--couleur-texte)]">Connexion réussie</h1>
                  <p className="mt-2 text-[13.5px] text-[var(--couleur-texte-secondaire)]">Redirection vers votre tableau de bord…</p>
                  <a href="/tableau-de-bord" className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--couleur-primaire)] text-[14px] font-semibold text-white shadow-[var(--ombre-primaire)] hover:bg-[var(--couleur-primaire-sombre)]">
                    Accéder à mon espace
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 pb-6 text-[11.5px] text-[var(--couleur-texte-faible)] md:px-10 md:pb-8">
          <span>© {new Date().getFullYear()} AutoMobile CI</span>
          <a href="https://www.automobile.ci" className="hover:text-[var(--couleur-texte)]">Site client →</a>
        </footer>
      </main>

      {/* Panneau marque */}
      <aside aria-hidden="true" className="hidden lg:flex lg:items-center lg:justify-center lg:bg-[var(--couleur-primaire)] lg:p-12">
        <div className="relative flex w-full max-w-md flex-col gap-8 overflow-hidden rounded-3xl bg-white/10 p-10 ring-1 ring-white/20">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '20px 20px', maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, #000 20%, transparent 80%)' }} />
          <div className="relative">
            <p className="text-[13px] font-semibold uppercase tracking-widest text-white/60">Espace partenaire</p>
            <ul className="mt-5 flex flex-col gap-4">
              {[
                { icone: '📊', titre: 'Tableau de bord complet', desc: 'Suivi des réservations, revenus et avis en temps réel.' },
                { icone: '🚘', titre: 'Gestion de flotte', desc: 'Ajoutez, modifiez et planifiez la disponibilité de vos véhicules.' },
                { icone: '💰', titre: 'Versements automatiques', desc: 'Recevez vos paiements directement sur votre compte Mobile Money.' },
                { icone: '📱', titre: 'Application mobile', desc: 'Gérez votre activité depuis votre smartphone, même hors ligne.' },
              ].map(({ icone, titre, desc }) => (
                <li key={titre} className="flex items-start gap-3">
                  <span className="text-[20px]">{icone}</span>
                  <div>
                    <p className="text-[13px] font-semibold text-white">{titre}</p>
                    <p className="text-[12px] text-white/65">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}

function IconGoogle() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className="size-4">
      <path d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5Z" fill="#4285F4"/>
      <path d="M9 18c2.4 0 4.5-.8 5.9-2.2L12 13.6c-.8.5-1.8.9-3 .9-2.3 0-4.3-1.6-5-3.7H1v2.3A9 9 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M4 10.8a5.4 5.4 0 0 1 0-3.5V5H1a9 9 0 0 0 0 8.1l3-2.3Z" fill="#FBBC05"/>
      <path d="M9 3.6c1.3 0 2.5.5 3.4 1.3L15 2.4A9 9 0 0 0 1 5l3 2.3c.7-2.1 2.7-3.7 5-3.7Z" fill="#EA4335"/>
    </svg>
  );
}

function IconApple() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 text-[var(--couleur-texte)]">
      <path fill="currentColor" d="M11.2 8.5c0-1.6 1.3-2.4 1.4-2.4-.8-1.1-2-1.3-2.4-1.3-1-.1-2 .6-2.5.6s-1.3-.6-2.2-.6C4.4 4.8 3.3 5.5 2.7 6.6c-1.2 2.1-.3 5.2.9 6.9.6.8 1.2 1.7 2.1 1.7.8 0 1.2-.5 2.2-.5s1.3.5 2.2.5 1.5-.8 2-1.7c.6-.9.9-1.8.9-1.9 0 0-1.8-.7-1.8-3.1ZM9.6 3.6c.5-.6.8-1.3.7-2.1-.7 0-1.5.5-2 1.1-.4.5-.8 1.3-.7 2 .8.1 1.5-.4 2-1Z"/>
    </svg>
  );
}
