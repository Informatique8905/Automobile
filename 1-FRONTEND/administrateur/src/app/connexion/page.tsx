/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Connexion de l'équipe
 * Route : /connexion    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • E-mail + mot de passe uniquement (pas de Google/Apple sur admin)
 *   • Étape TOTP obligatoire (aal2) si MFA configuré
 *
 * SÉCURITÉ
 *   • Pas de fournisseurs OAuth (surface d'attaque réduite)
 *   • Après signInWithPassword → vérifier l'aal2 : si MFA requis, afficher le code TOTP
 *   • Message d'erreur identique compte existant ou non
 *   • Non indexé (robots.txt + X-Robots-Tag)
 * ═══════════════════════════════════════════════════════════════════════════
 */
'use client';

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { clientNavigateur } from '@plateforme/supabase/navigateur';
import { cn } from '@plateforme/ui/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

type Vue = 'formulaire' | 'totp' | 'succes';

// ─── Constantes ─────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LONGUEUR_TOTP = 6;

function messageFriendly(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Identifiants incorrects.';
  if (msg.includes('Too many requests')) return 'Trop de tentatives. Attendez quelques minutes.';
  if (msg.includes('Invalid OTP') || msg.includes('invalid_otp')) return 'Code incorrect ou expiré.';
  return msg;
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function PageConnexionAdmin() {
  const uid = useId();
  const supabase = clientNavigateur();

  const [vue, setVue] = useState<Vue>('formulaire');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [toucheEmail, setToucheEmail] = useState(false);
  const [toucheMdp, setToucheMdp] = useState(false);
  const [soumis, setSoumis] = useState(false);
  const [afficherMdp, setAfficherMdp] = useState(false);
  const [verrou, setVerrou] = useState(false);
  const [motDePasseFocus, setMotDePasseFocus] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  // TOTP
  const [codeTotp, setCodeTotp] = useState('');
  const [erreurTotp, setErreurTotp] = useState<string | null>(null);
  const [verificationTotp, setVerificationTotp] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);

  const titreRef = useRef<HTMLHeadingElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const mdpRef = useRef<HTMLInputElement>(null);
  const banniereRef = useRef<HTMLDivElement>(null);
  const deplacerFocus = useRef(false);

  useLayoutEffect(() => {
    if (!deplacerFocus.current) return;
    deplacerFocus.current = false;
    titreRef.current?.focus({ preventScroll: true });
  }, [vue]);

  const erreurEmail = !email.trim() ? "Saisissez votre e-mail." : !EMAIL_RE.test(email.trim()) ? "E-mail invalide." : null;
  const erreurMdp = !motDePasse ? "Saisissez votre mot de passe." : null;

  const erreurEmailVisible = soumis || toucheEmail ? erreurEmail : null;
  const erreurMdpVisible = soumis || toucheMdp ? erreurMdp : null;

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    if (enCours) return;
    setSoumis(true);
    if (erreurEmail) { emailRef.current?.focus(); return; }
    if (erreurMdp) { mdpRef.current?.focus(); return; }
    setErreur(null);
    setEnCours(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: motDePasse,
      });
      if (error) throw new Error(messageFriendly(error.message));

      // Vérifier si MFA est requis
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
        // MFA requis — récupérer le factorId
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totpFactor = factors?.totp?.[0];
        if (!totpFactor) throw new Error('Aucun facteur TOTP configuré. Contactez un administrateur.');
        setFactorId(totpFactor.id);
        deplacerFocus.current = true;
        setVue('totp');
      } else {
        deplacerFocus.current = true;
        setVue('succes');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Une erreur est survenue.';
      setErreur(msg);
      window.requestAnimationFrame(() => banniereRef.current?.focus({ preventScroll: false }));
    } finally {
      setEnCours(false);
    }
  };

  const verifierTotp = async (code: string) => {
    if (code.length !== LONGUEUR_TOTP || verificationTotp || !factorId) return;
    setVerificationTotp(true);
    setErreurTotp(null);
    try {
      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeErr) throw new Error(messageFriendly(challengeErr.message));

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });
      if (verifyErr) throw new Error(messageFriendly(verifyErr.message));

      deplacerFocus.current = true;
      setVue('succes');
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Code incorrect.";
      setErreurTotp(msg);
      setCodeTotp('');
    } finally {
      setVerificationTotp(false);
    }
  };

  const titreId = `${uid}-titre`;
  const transition = {
    initial: { opacity: 0, y: 6, filter: 'blur(3px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, y: -6, filter: 'blur(3px)' },
    transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const },
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--couleur-fond-doux)] p-4">
      <div className="w-full max-w-[400px]">
        {/* En-tête */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-[var(--couleur-texte)] shadow-[var(--ombre-md)]" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" className="size-6 text-white">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
            </svg>
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--couleur-texte-secondaire)]">AutoMobile CI</p>
            <p className="mt-0.5 text-[12px] text-[var(--couleur-texte-faible)]">Accès réservé à l'équipe interne</p>
          </div>
        </div>

        {/* Carte formulaire */}
        <div className="rounded-2xl border border-[var(--couleur-bordure)] bg-[var(--couleur-fond)] shadow-[var(--ombre-lg)]">
          <AnimatePresence mode="wait">
            {vue === 'formulaire' && (
              <motion.div key="formulaire" {...transition} className="p-8">
                <h1
                  id={titreId}
                  ref={titreRef}
                  tabIndex={-1}
                  className="text-[22px] font-semibold tracking-tight text-[var(--couleur-texte)] outline-none"
                >
                  Connexion administrateur
                </h1>
                <p className="mt-1.5 text-[13px] text-[var(--couleur-texte-secondaire)]">
                  Authentification à deux facteurs obligatoire.
                </p>

                {erreur && (
                  <div
                    ref={banniereRef}
                    tabIndex={-1}
                    role="alert"
                    className="mt-5 flex gap-3 rounded-xl border border-[var(--couleur-erreur)]/20 bg-[var(--couleur-erreur-fond)] px-3.5 py-3 text-[12.5px] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-[var(--couleur-erreur)]"
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-[var(--couleur-erreur)]">
                      <path d="M8 1.75 15 14H1L8 1.75Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                      <path d="M8 6.25v3.5M8 11.6v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <p className="text-[var(--couleur-texte)]">{erreur}</p>
                  </div>
                )}

                <form noValidate onSubmit={soumettre} className="mt-6 flex flex-col gap-4">
                  {/* E-mail */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`${uid}-email`} className="text-[12.5px] font-medium text-[var(--couleur-texte)]">
                      Adresse e-mail
                    </label>
                    <input
                      ref={emailRef}
                      id={`${uid}-email`}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="admin@automobile.ci"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (erreur) setErreur(null); }}
                      onBlur={() => setToucheEmail(true)}
                      readOnly={enCours}
                      aria-invalid={erreurEmailVisible ? true : undefined}
                      className={cn(
                        'h-10 w-full rounded-xl border border-[var(--couleur-bordure)] bg-[var(--couleur-fond-moyen)] px-3.5 text-[14px] text-[var(--couleur-texte)] placeholder:text-[var(--couleur-texte-faible)] transition-[border-color,box-shadow]',
                        'focus:border-[var(--couleur-primaire)] focus:bg-[var(--couleur-fond)] focus:outline-none focus:shadow-[0_0_0_3px_rgb(255_107_0/0.15)]',
                        erreurEmailVisible && 'border-[var(--couleur-erreur)]',
                      )}
                    />
                    {erreurEmailVisible && <p role="alert" className="text-[12px] text-[var(--couleur-erreur)]">{erreurEmailVisible}</p>}
                  </div>

                  {/* Mot de passe */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`${uid}-mdp`} className="text-[12.5px] font-medium text-[var(--couleur-texte)]">
                      Mot de passe
                    </label>
                    <div className="relative flex items-center">
                      <input
                        ref={mdpRef}
                        id={`${uid}-mdp`}
                        type={afficherMdp ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Votre mot de passe"
                        value={motDePasse}
                        onChange={(e) => { setMotDePasse(e.target.value); if (erreur) setErreur(null); }}
                        onBlur={() => { setToucheMdp(true); setMotDePasseFocus(false); setVerrou(false); }}
                        onFocus={() => setMotDePasseFocus(true)}
                        onKeyDown={(e) => setVerrou(e.getModifierState?.('CapsLock') ?? false)}
                        onKeyUp={(e) => setVerrou(e.getModifierState?.('CapsLock') ?? false)}
                        readOnly={enCours}
                        aria-invalid={erreurMdpVisible ? true : undefined}
                        className={cn(
                          'h-10 w-full rounded-xl border border-[var(--couleur-bordure)] bg-[var(--couleur-fond-moyen)] px-3.5 pr-10 text-[14px] text-[var(--couleur-texte)] placeholder:text-[var(--couleur-texte-faible)] transition-[border-color,box-shadow]',
                          'focus:border-[var(--couleur-primaire)] focus:bg-[var(--couleur-fond)] focus:outline-none focus:shadow-[0_0_0_3px_rgb(255_107_0/0.15)]',
                          erreurMdpVisible && 'border-[var(--couleur-erreur)]',
                        )}
                      />
                      <button type="button" onClick={() => setAfficherMdp((v) => !v)} aria-label={afficherMdp ? 'Masquer' : 'Afficher'} aria-pressed={afficherMdp} className="absolute right-1 flex size-8 items-center justify-center rounded-lg text-[var(--couleur-texte-secondaire)] hover:text-[var(--couleur-texte)] focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)]">
                        {afficherMdp ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {erreurMdpVisible && <p role="alert" className="text-[12px] text-[var(--couleur-erreur)]">{erreurMdpVisible}</p>}
                    {verrou && motDePasseFocus && (
                      <p className="flex items-center gap-1.5 text-[12px] text-[var(--couleur-alerte)]">
                        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3 shrink-0">
                          <path d="M8 2.5 13.5 8H10.5v3h-5V8H2.5L8 2.5ZM5.5 13.5h5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"/>
                        </svg>
                        Majuscule activée
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={enCours}
                    className={cn(
                      'flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--couleur-texte)] text-[14px] font-semibold text-white shadow-[var(--ombre)] transition-all',
                      'hover:bg-[var(--couleur-texte-secondaire)]',
                      'focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)] focus-visible:outline-offset-2',
                      'disabled:opacity-60',
                    )}
                  >
                    {enCours ? <><Loader2 className="size-4 animate-spin" /> Vérification</> : 'Continuer'}
                  </button>
                </form>
              </motion.div>
            )}

            {vue === 'totp' && (
              <motion.div key="totp" {...transition} className="p-8">
                <span className="grid size-12 place-items-center rounded-2xl border border-[var(--couleur-primaire)]/20 bg-[var(--couleur-primaire-doux)]" aria-hidden="true">
                  <ShieldCheck className="size-6 text-[var(--couleur-primaire)]" />
                </span>

                <h1
                  id={titreId}
                  ref={titreRef}
                  tabIndex={-1}
                  className="mt-5 text-[22px] font-semibold tracking-tight text-[var(--couleur-texte)] outline-none"
                >
                  Code d'authentification
                </h1>
                <p className="mt-1.5 text-[13px] text-[var(--couleur-texte-secondaire)]">
                  Saisissez le code à 6 chiffres de votre application d'authentification (Google Authenticator, Authy…).
                </p>

                <form
                  className="mt-6"
                  noValidate
                  onSubmit={(e) => { e.preventDefault(); void verifierTotp(codeTotp); }}
                >
                  <SaisieCode
                    valeur={codeTotp}
                    onChange={(val) => {
                      setCodeTotp(val);
                      setErreurTotp(null);
                      if (val.length === LONGUEUR_TOTP) void verifierTotp(val);
                    }}
                    erreur={erreurTotp}
                    occupe={verificationTotp}
                  />

                  <button
                    type="submit"
                    disabled={codeTotp.length !== LONGUEUR_TOTP && !verificationTotp}
                    className={cn(
                      'mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--couleur-primaire)] text-[14px] font-semibold text-white shadow-[var(--ombre-primaire)] transition-all',
                      'hover:bg-[var(--couleur-primaire-sombre)] disabled:opacity-50',
                    )}
                  >
                    {verificationTotp ? <><Loader2 className="size-4 animate-spin" /> Vérification</> : 'Vérifier et accéder'}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => { setVue('formulaire'); setCodeTotp(''); setErreurTotp(null); }}
                  className="-ml-1 mt-4 inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-[12.5px] text-[var(--couleur-texte-secondaire)] hover:text-[var(--couleur-texte)] focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)]"
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5">
                    <path d="M10 3.5 5.5 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Retour
                </button>
              </motion.div>
            )}

            {vue === 'succes' && (
              <motion.div key="succes" {...transition} className="flex flex-col items-center p-8 text-center">
                <span className="grid size-14 place-items-center rounded-2xl border border-[var(--couleur-succes)]/30 bg-[var(--couleur-succes-fond)]" aria-hidden="true">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7">
                    <motion.path d="M5.5 12.5 10 17l8.5-9.5" fill="none" stroke="var(--couleur-succes)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.36, delay: 0.08 }} />
                  </svg>
                </span>
                <h1 id={titreId} ref={titreRef} tabIndex={-1} className="mt-5 text-[22px] font-semibold tracking-tight text-[var(--couleur-texte)] outline-none">
                  Accès autorisé
                </h1>
                <p className="mt-1.5 text-[13px] text-[var(--couleur-texte-secondaire)]">
                  Redirection vers le tableau de bord…
                </p>
                <a
                  href="/tableau-de-bord"
                  className={cn(
                    'mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--couleur-primaire)] text-[14px] font-semibold text-white shadow-[var(--ombre-primaire)] transition-all',
                    'hover:bg-[var(--couleur-primaire-sombre)]',
                  )}
                >
                  Accéder au tableau de bord
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-6 text-center text-[11.5px] text-[var(--couleur-texte-faible)]">
          Accès restreint · Session chiffrée · Journal d'audit activé
        </p>
      </div>
    </div>
  );
}

// ─── Saisie de code TOTP ──────────────────────────────────────────────────────

function SaisieCode({
  valeur, onChange, erreur, occupe,
}: {
  valeur: string;
  onChange: (v: string) => void;
  erreur: string | null;
  occupe: boolean;
}) {
  const id = useId();
  const [focus, setFocus] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="text-[12.5px] font-medium text-[var(--couleur-texte)]">
        Code TOTP
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          value={valeur}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, LONGUEUR_TOTP))}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={LONGUEUR_TOTP}
          readOnly={occupe}
          aria-invalid={erreur ? true : undefined}
          className="absolute inset-0 z-10 w-full cursor-text bg-transparent font-mono text-transparent caret-transparent opacity-0 outline-none"
        />
        <div className="grid grid-cols-6 gap-2" aria-hidden="true">
          {Array.from({ length: LONGUEUR_TOTP }).map((_, i) => {
            const actif = focus && (i === valeur.length || (i === LONGUEUR_TOTP - 1 && valeur.length === LONGUEUR_TOTP));
            return (
              <span
                key={i}
                className={cn(
                  'grid h-12 place-items-center rounded-xl border bg-[var(--couleur-fond-moyen)] font-mono text-[20px] font-medium tabular-nums transition-[border-color] duration-150',
                  erreur ? 'border-[var(--couleur-erreur)]' : actif ? 'border-[var(--couleur-primaire)] ring-[3px] ring-[var(--couleur-primaire)]/15' : 'border-[var(--couleur-bordure)]',
                  i === 2 && 'mr-1',
                  i === 3 && 'ml-1',
                )}
              >
                {valeur[i] ?? ''}
                {actif && !valeur[i] && <span className="h-5 w-px animate-pulse bg-[var(--couleur-primaire)] motion-reduce:animate-none" />}
              </span>
            );
          })}
        </div>
      </div>
      {erreur && <p role="alert" className="mt-2 text-[12px] text-[var(--couleur-erreur)]">{erreur}</p>}
      {!erreur && <p className="mt-2 text-[12px] text-[var(--couleur-texte-faible)]">Saisissez le code — il sera vérifié automatiquement.</p>}
    </div>
  );
}
