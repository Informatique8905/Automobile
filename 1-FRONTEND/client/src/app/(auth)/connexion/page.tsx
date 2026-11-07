/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Connexion
 * Route : /connexion    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • E-mail + mot de passe, Google, Apple
 *   • Lien magique + code à 6 chiffres en repli
 *   • Mot de passe oublié
 *
 * DONNÉES
 *   • Supabase Auth signInWithPassword / signInWithOtp / signInWithOAuth
 *
 * SÉCURITÉ
 *   • Message d'erreur identique que le compte existe ou non
 *   • Si TOTP activé : écran de code (géré par Supabase Auth aal2)
 * ═══════════════════════════════════════════════════════════════════════════
 */
'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import { clientNavigateur } from '@plateforme/supabase/navigateur';
import { cn } from '@plateforme/ui/utils';
import type { Provider } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────────────────────────────────────

type Vue = 'formulaire' | 'lien-magique' | 'succes';

interface Champs {
  email: string;
  motDePasse: string;
}

type Erreurs = Partial<Record<keyof Champs, string>>;

// ─── Constantes ─────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LONGUEUR_CODE = 6;

function valider(valeurs: Champs): Erreurs {
  const erreurs: Erreurs = {};
  if (!valeurs.email.trim()) erreurs.email = 'Saisissez votre adresse e-mail.';
  else if (!EMAIL_RE.test(valeurs.email.trim())) erreurs.email = "Cette adresse e-mail n'est pas valide.";
  if (!valeurs.motDePasse) erreurs.motDePasse = 'Saisissez votre mot de passe.';
  return erreurs;
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function PageConnexion() {
  const uid = useId();
  const supabase = clientNavigateur();

  const [vue, setVue] = useState<Vue>('formulaire');
  const [valeurs, setValeurs] = useState<Champs>({ email: '', motDePasse: '' });
  const [touche, setTouche] = useState<Partial<Record<keyof Champs, boolean>>>({});
  const [soumis, setSoumis] = useState(false);
  const [erreurFormulaire, setErreurFormulaire] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<null | 'submit' | 'magic' | Provider>(null);
  const [afficherMdp, setAfficherMdp] = useState(false);
  const [verrou, setVerrou] = useState(false);
  const [motDePasseFocus, setMotDePasseFocus] = useState(false);

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

  const allerA = useCallback((prochaine: Vue) => {
    deplacerFocus.current = true;
    setVue(prochaine);
  }, []);

  const erreurs = valider(valeurs);
  const erreurVisible = (champ: keyof Champs) =>
    soumis || touche[champ] ? (erreurs[champ] ?? null) : null;

  const mettreAJour = (champ: keyof Champs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValeurs((prev) => ({ ...prev, [champ]: e.target.value }));
    if (erreurFormulaire) setErreurFormulaire(null);
  };
  const desactiver = (champ: keyof Champs) => () => {
    if (valeurs[champ]) setTouche((prev) => ({ ...prev, [champ]: true }));
  };

  const occupe = enCours !== null;

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    if (occupe) return;
    setSoumis(true);
    const premierInvalide = (['email', 'motDePasse'] as const).find((c) => erreurs[c]);
    if (premierInvalide) {
      ({ email: emailRef, motDePasse: mdpRef })[premierInvalide].current?.focus();
      return;
    }
    setErreurFormulaire(null);
    setEnCours('submit');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: valeurs.email.trim(),
        password: valeurs.motDePasse,
      });
      if (error) throw new Error(messageFriendly(error.message));
      allerA('succes');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Une erreur est survenue. Réessayez.';
      setErreurFormulaire(msg);
      window.requestAnimationFrame(() => banniereRef.current?.focus({ preventScroll: false }));
    } finally {
      setEnCours(null);
    }
  };

  const connecterSSO = async (fournisseur: Provider) => {
    if (occupe) return;
    setEnCours(fournisseur);
    setErreurFormulaire(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: fournisseur,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw new Error(messageFriendly(error.message));
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Connexion ${fournisseur} annulée.`;
      setErreurFormulaire(msg);
    } finally {
      setEnCours(null);
    }
  };

  const envoyerLienMagique = async () => {
    if (occupe) return;
    setTouche((prev) => ({ ...prev, email: true }));
    if (erreurs.email) { emailRef.current?.focus(); return; }
    setEnCours('magic');
    setErreurFormulaire(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: valeurs.email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw new Error(messageFriendly(error.message));
      allerA('lien-magique');
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Impossible d'envoyer le lien. Réessayez.";
      setErreurFormulaire(msg);
    } finally {
      setEnCours(null);
    }
  };

  const verifierCode = useCallback(
    async (code: string) => {
      const { error } = await supabase.auth.verifyOtp({
        email: valeurs.email.trim(),
        token: code,
        type: 'email',
      });
      if (error) throw new Error(messageFriendly(error.message));
      allerA('succes');
    },
    [supabase, valeurs.email, allerA],
  );

  const verifierCaps = (e: ReactKeyboardEvent<HTMLInputElement>) => setVerrou(e.getModifierState?.('CapsLock') ?? false);

  const titreId = `${uid}-titre`;

  const transition = {
    initial: { opacity: 0, y: 6, filter: 'blur(3px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, y: -6, filter: 'blur(3px)' },
    transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const },
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* ── Colonne formulaire ── */}
      <main
        className="flex flex-col bg-[var(--couleur-fond)]"
        aria-labelledby={titreId}
      >
        {/* En-tête */}
        <header className="flex items-center justify-between gap-4 px-6 pt-6 md:px-10 md:pt-8">
          <a href="/" className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)] focus-visible:outline-offset-2">
            {/* Logo SVG inline — remplacer par <Image> quand le composant Next est disponible */}
            <span className="grid size-9 place-items-center rounded-xl bg-[var(--couleur-primaire)] shadow-[var(--ombre-primaire)]" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" className="size-5 text-white">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-[var(--couleur-texte)]">
              Auto<span className="text-[var(--couleur-primaire)]">Mobile</span>
            </span>
          </a>
          <a href="/inscription" className="rounded text-[12.5px] text-[var(--couleur-texte-secondaire)] transition-colors hover:text-[var(--couleur-texte)] focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)]">
            Pas de compte ?{' '}
            <span className="font-medium text-[var(--couleur-orange-accessible)]">S'inscrire</span>
          </a>
        </header>

        {/* Contenu centré */}
        <div className="flex flex-1 items-center justify-center px-6 py-10 md:px-10">
          <div className="w-full max-w-[384px]">
            <AnimatePresence mode="wait">
              {vue === 'formulaire' && (
                <motion.div key="formulaire" {...transition}>
                  <h1
                    id={titreId}
                    ref={titreRef}
                    tabIndex={-1}
                    className="text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--couleur-texte)] outline-none md:text-[32px]"
                  >
                    Bon retour !
                  </h1>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--couleur-texte-secondaire)]">
                    Connectez-vous pour accéder à vos réservations et favoris.
                  </p>

                  {/* Boutons SSO */}
                  <div className="mt-7 grid grid-cols-2 gap-3">
                    {(['google', 'apple'] as const).map((fournisseur) => (
                      <button
                        key={fournisseur}
                        type="button"
                        onClick={() => connecterSSO(fournisseur)}
                        disabled={occupe && enCours !== fournisseur}
                        aria-busy={enCours === fournisseur || undefined}
                        aria-label={`Connexion avec ${fournisseur === 'google' ? 'Google' : 'Apple'}`}
                        className={cn(
                          'flex h-11 items-center justify-center gap-2.5 rounded-xl border border-[var(--couleur-bordure)] bg-[var(--couleur-fond)] text-[13px] font-medium text-[var(--couleur-texte)] shadow-[var(--ombre-sm)] transition-all',
                          'hover:border-[var(--couleur-bordure-active)] hover:shadow-[var(--ombre)]',
                          'focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)] focus-visible:outline-offset-2',
                          'disabled:cursor-not-allowed disabled:opacity-50',
                        )}
                      >
                        {enCours === fournisseur ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : fournisseur === 'google' ? (
                          <IconGoogle />
                        ) : (
                          <IconApple />
                        )}
                        <span>{fournisseur === 'google' ? 'Google' : 'Apple'}</span>
                      </button>
                    ))}
                  </div>

                  {/* Séparateur */}
                  <div className="my-6 flex items-center gap-3" role="presentation">
                    <span className="h-px flex-1 bg-[var(--couleur-bordure)]" />
                    <span className="text-[11px] font-medium uppercase tracking-widest text-[var(--couleur-texte-faible)]">ou par e-mail</span>
                    <span className="h-px flex-1 bg-[var(--couleur-bordure)]" />
                  </div>

                  {/* Formulaire */}
                  <form
                    noValidate
                    onSubmit={soumettre}
                    aria-busy={enCours === 'submit' || undefined}
                    className="flex flex-col gap-4"
                  >
                    {/* Bannière d'erreur */}
                    {erreurFormulaire && (
                      <div
                        ref={banniereRef}
                        tabIndex={-1}
                        role="alert"
                        className="flex gap-3 rounded-xl border border-[var(--couleur-erreur)]/20 bg-[var(--couleur-erreur-fond)] px-3.5 py-3 text-[12.5px] leading-relaxed text-[var(--couleur-texte)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--couleur-erreur)]"
                      >
                        <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-[var(--couleur-erreur)]">
                          <path d="M8 1.75 15 14H1L8 1.75Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                          <path d="M8 6.25v3.5M8 11.6v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <p>{erreurFormulaire}</p>
                      </div>
                    )}

                    {/* E-mail */}
                    <ChampFormulaire
                      ref={emailRef}
                      id={`${uid}-email`}
                      label="Adresse e-mail"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="vous@exemple.ci"
                      value={valeurs.email}
                      onChange={mettreAJour('email')}
                      onBlur={desactiver('email')}
                      readOnly={occupe}
                      error={erreurVisible('email')}
                    />

                    {/* Mot de passe */}
                    <ChampFormulaire
                      ref={mdpRef}
                      id={`${uid}-mdp`}
                      label="Mot de passe"
                      type={afficherMdp ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Votre mot de passe"
                      value={valeurs.motDePasse}
                      onChange={mettreAJour('motDePasse')}
                      onBlur={() => { desactiver('motDePasse')(); setMotDePasseFocus(false); setVerrou(false); }}
                      onFocus={() => setMotDePasseFocus(true)}
                      onKeyDown={verifierCaps}
                      onKeyUp={verifierCaps}
                      readOnly={occupe}
                      error={erreurVisible('motDePasse')}
                      indice={verrou && motDePasseFocus ? (
                        <span className="flex items-center gap-1.5 text-[var(--couleur-alerte)]">
                          <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3 shrink-0">
                            <path d="M8 2.5 13.5 8H10.5v3h-5V8H2.5L8 2.5ZM5.5 13.5h5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"/>
                          </svg>
                          Majuscule activée
                        </span>
                      ) : undefined}
                      labelAcote={
                        <a
                          href="/mot-de-passe-oublie"
                          className="rounded text-[12px] text-[var(--couleur-texte-secondaire)] transition-colors hover:text-[var(--couleur-orange-accessible)] focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)]"
                        >
                          Mot de passe oublié ?
                        </a>
                      }
                      trailing={
                        <button
                          type="button"
                          onClick={() => setAfficherMdp((v) => !v)}
                          aria-label={afficherMdp ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                          aria-pressed={afficherMdp}
                          className="flex size-8 items-center justify-center rounded-lg text-[var(--couleur-texte-secondaire)] transition-colors hover:text-[var(--couleur-texte)] focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)]"
                        >
                          {afficherMdp ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      }
                    />

                    {/* Bouton soumettre */}
                    <button
                      type="submit"
                      disabled={occupe && enCours !== 'submit'}
                      aria-disabled={enCours === 'submit' || undefined}
                      className={cn(
                        'mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--couleur-primaire)] text-[14px] font-semibold text-white shadow-[var(--ombre-primaire)] transition-all',
                        'hover:bg-[var(--couleur-primaire-sombre)] hover:shadow-[var(--ombre-md)]',
                        'focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)] focus-visible:outline-offset-2',
                        'active:scale-[0.99]',
                        'disabled:cursor-not-allowed disabled:opacity-60',
                      )}
                    >
                      {enCours === 'submit' ? (
                        <><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Connexion en cours</>
                      ) : 'Se connecter'}
                    </button>

                    {/* Lien magique */}
                    <button
                      type="button"
                      onClick={envoyerLienMagique}
                      disabled={occupe && enCours !== 'magic'}
                      className={cn(
                        'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] text-[var(--couleur-texte-secondaire)] transition-colors',
                        'hover:bg-[var(--couleur-fond-moyen)] hover:text-[var(--couleur-texte)]',
                        'focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)]',
                        'disabled:opacity-50',
                      )}
                    >
                      {enCours === 'magic' ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Mail className="size-4" aria-hidden="true" />}
                      Recevoir un lien de connexion par e-mail
                    </button>
                  </form>
                </motion.div>
              )}

              {vue === 'lien-magique' && (
                <motion.div key="lien-magique" {...transition}>
                  <VueLienMagique
                    titreId={titreId}
                    titreRef={titreRef}
                    email={valeurs.email.trim()}
                    onRetour={() => allerA('formulaire')}
                    onRenvoyer={async () => {
                      await supabase.auth.signInWithOtp({
                        email: valeurs.email.trim(),
                        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
                      });
                    }}
                    onVerifier={verifierCode}
                  />
                </motion.div>
              )}

              {vue === 'succes' && (
                <motion.div key="succes" {...transition}>
                  <VueSucces titreId={titreId} titreRef={titreRef} email={valeurs.email.trim()} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Pied de page */}
        <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 pb-6 text-[11.5px] text-[var(--couleur-texte-faible)] md:px-10 md:pb-8">
          <span>© {new Date().getFullYear()} AutoMobile CI</span>
          <nav className="flex gap-4" aria-label="Liens légaux">
            <a href="/conditions" className="hover:text-[var(--couleur-texte)]">CGU</a>
            <a href="/confidentialite" className="hover:text-[var(--couleur-texte)]">Confidentialité</a>
            <a href="/contact" className="hover:text-[var(--couleur-texte)]">Contact</a>
          </nav>
        </footer>
      </main>

      {/* ── Panneau marque (masqué sur mobile) ── */}
      <aside
        aria-hidden="true"
        className="hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:bg-[var(--couleur-primaire)] lg:p-12"
      >
        <PanneauMarque />
      </aside>
    </div>
  );
}

// ─── Composants secondaires ───────────────────────────────────────────────────

// React 19 : ref peut être passé directement en prop
interface ChampProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string | null;
  indice?: React.ReactNode;
  labelAcote?: React.ReactNode;
  trailing?: React.ReactNode;
  ref?: React.Ref<HTMLInputElement>;
}

function ChampFormulaire({ id, label, error, indice, labelAcote, trailing, className, ref, ...props }: ChampProps) {
  const hintId = error ? `${id}-erreur` : indice ? `${id}-indice` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[12.5px] font-medium text-[var(--couleur-texte)]">
          {label}
        </label>
        {labelAcote}
      </div>
      <div className="relative flex items-center">
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={hintId}
          className={cn(
            'h-10 w-full rounded-xl border border-[var(--couleur-bordure)] bg-[var(--couleur-fond-moyen)] px-3.5 text-[14px] text-[var(--couleur-texte)] placeholder:text-[var(--couleur-texte-faible)] transition-[border-color,box-shadow]',
            'focus:border-[var(--couleur-primaire)] focus:bg-[var(--couleur-fond)] focus:outline-none focus:shadow-[0_0_0_3px_rgb(255_107_0/0.15)]',
            error && 'border-[var(--couleur-erreur)] focus:border-[var(--couleur-erreur)] focus:shadow-[0_0_0_3px_rgb(185_28_28/0.12)]',
            trailing && 'pr-10',
            className,
          )}
          {...props}
        />
        {trailing && (
          <div className="absolute right-1 flex items-center">
            {trailing}
          </div>
        )}
      </div>
      {error && (
        <p id={`${id}-erreur`} role="alert" className="text-[12px] text-[var(--couleur-erreur)]">
          {error}
        </p>
      )}
      {!error && indice && (
        <p id={`${id}-indice`} className="text-[12px]">{indice}</p>
      )}
    </div>
  );
}

// Vue lien magique
function VueLienMagique({
  titreId, titreRef, email, onRetour, onRenvoyer, onVerifier,
}: {
  titreId: string;
  titreRef: React.RefObject<HTMLHeadingElement | null>;
  email: string;
  onRetour: () => void;
  onRenvoyer: () => Promise<void>;
  onVerifier: (code: string) => Promise<void>;
}) {
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [verification, setVerification] = useState(false);
  const [renvoi, setRenvoi] = useState(false);
  const [restant, setRestant] = useState(60);
  const codeId = useId();

  useEffect(() => {
    if (restant <= 0) return;
    const id = window.setTimeout(() => setRestant((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [restant]);

  const verifier = async (valeur: string) => {
    if (valeur.length !== LONGUEUR_CODE || verification) return;
    setVerification(true);
    setErreur(null);
    try {
      await onVerifier(valeur);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ce code ne fonctionne pas.";
      setErreur(msg);
      setCode('');
    } finally {
      setVerification(false);
    }
  };

  const renvoyer = async () => {
    setRenvoi(true);
    try { await onRenvoyer(); setRestant(60); setErreur(null); }
    finally { setRenvoi(false); }
  };

  const mm = Math.floor(restant / 60);
  const ss = String(restant % 60).padStart(2, '0');

  return (
    <div>
      <button
        type="button"
        onClick={onRetour}
        className="-ml-1 mb-8 inline-flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-[12.5px] text-[var(--couleur-texte-secondaire)] transition-colors hover:text-[var(--couleur-texte)] focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)]"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5">
          <path d="M10 3.5 5.5 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Changer d'adresse
      </button>

      {/* Icône enveloppe */}
      <span className="relative grid size-14 place-items-center rounded-2xl border border-[var(--couleur-bordure)] bg-[var(--couleur-fond)] shadow-[var(--ombre)]" aria-hidden="true">
        <Mail className="size-7 text-[var(--couleur-primaire)]" />
        <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[var(--couleur-primaire)] text-[11px] font-semibold text-white ring-2 ring-[var(--couleur-fond)]">1</span>
      </span>

      <h1
        id={titreId}
        ref={titreRef}
        tabIndex={-1}
        className="mt-6 text-[28px] font-semibold leading-tight tracking-tight text-[var(--couleur-texte)] outline-none"
      >
        Vérifiez votre boîte mail
      </h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--couleur-texte-secondaire)]">
        Nous avons envoyé un lien à{' '}
        <span className="font-medium text-[var(--couleur-texte)] [overflow-wrap:anywhere]">{email}</span>.
        Ou saisissez le code à 6 chiffres de cet e-mail.
      </p>

      <form
        className="mt-7"
        noValidate
        onSubmit={(e) => { e.preventDefault(); void verifier(code); }}
      >
        <label htmlFor={codeId} className="text-[12.5px] font-medium text-[var(--couleur-texte)]">
          Code de vérification
        </label>
        <div className="relative mt-1.5">
          <input
            id={codeId}
            value={code}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, LONGUEUR_CODE);
              setCode(val);
              setErreur(null);
              if (val.length === LONGUEUR_CODE) void verifier(val);
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={LONGUEUR_CODE}
            readOnly={verification}
            aria-invalid={erreur ? true : undefined}
            className="absolute inset-0 z-10 w-full cursor-text bg-transparent font-mono text-transparent caret-transparent opacity-0 outline-none"
          />
          <div className="grid grid-cols-6 gap-2" aria-hidden="true">
            {Array.from({ length: LONGUEUR_CODE }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'grid h-12 place-items-center rounded-xl border bg-[var(--couleur-fond-moyen)] font-mono text-[20px] font-medium tabular-nums transition-[border-color] duration-150',
                  erreur ? 'border-[var(--couleur-erreur)]' : 'border-[var(--couleur-bordure)]',
                  i === 2 && 'mr-1',
                  i === 3 && 'ml-1',
                )}
              >
                {code[i] ?? ''}
              </span>
            ))}
          </div>
        </div>
        {erreur && (
          <p role="alert" className="mt-2 text-[12px] text-[var(--couleur-erreur)]">{erreur}</p>
        )}

        <button
          type="submit"
          disabled={code.length !== LONGUEUR_CODE && !verification}
          className={cn(
            'mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--couleur-primaire)] text-[14px] font-semibold text-white shadow-[var(--ombre-primaire)] transition-all',
            'hover:bg-[var(--couleur-primaire-sombre)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {verification ? <><Loader2 className="size-4 animate-spin" /> Vérification</> : 'Vérifier et se connecter'}
        </button>
      </form>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--couleur-bordure)] pt-4 text-[12.5px]">
        <span className="text-[var(--couleur-texte-faible)]">Rien reçu ? Vérifiez vos spams.</span>
        <button
          type="button"
          onClick={renvoyer}
          disabled={restant > 0 || renvoi}
          className="cursor-pointer rounded font-medium tabular-nums text-[var(--couleur-orange-accessible)] transition-colors hover:underline disabled:cursor-default disabled:text-[var(--couleur-texte-secondaire)] disabled:no-underline focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)]"
        >
          {renvoi ? 'Envoi…' : restant > 0 ? `Renvoyer dans ${mm}:${ss}` : 'Renvoyer le lien'}
        </button>
      </div>
    </div>
  );
}

function VueSucces({
  titreId, titreRef, email,
}: {
  titreId: string;
  titreRef: React.RefObject<HTMLHeadingElement | null>;
  email: string;
}) {
  return (
    <div className="flex flex-col items-start">
      <span className="grid size-14 place-items-center rounded-2xl border border-[var(--couleur-succes)]/30 bg-[var(--couleur-succes-fond)]" aria-hidden="true">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7">
          <motion.path
            d="M5.5 12.5 10 17l8.5-9.5"
            fill="none"
            stroke="var(--couleur-succes)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.36, delay: 0.08, ease: [0.23, 1, 0.32, 1] }}
          />
        </svg>
      </span>
      <h1
        id={titreId}
        ref={titreRef}
        tabIndex={-1}
        className="mt-6 text-[28px] font-semibold leading-tight tracking-tight text-[var(--couleur-texte)] outline-none"
      >
        Connexion réussie
      </h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--couleur-texte-secondaire)]">
        Vous êtes connecté avec <span className="font-medium text-[var(--couleur-texte)]">{email}</span>. Redirection en cours…
      </p>
      <a
        href="/compte"
        className={cn(
          'mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--couleur-primaire)] text-[14px] font-semibold text-white shadow-[var(--ombre-primaire)] transition-all',
          'hover:bg-[var(--couleur-primaire-sombre)]',
        )}
      >
        Accéder à mon espace
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
          <path d="M3.5 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </a>
    </div>
  );
}

function PanneauMarque() {
  return (
    <div className="relative flex w-full max-w-md flex-col justify-between gap-12 overflow-hidden rounded-3xl bg-white/10 p-10 ring-1 ring-white/20 backdrop-blur-sm">
      {/* Grille de points décorative */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, #000 20%, transparent 80%)',
        }}
      />

      {/* Statistiques */}
      <div className="relative grid grid-cols-2 gap-4">
        {[
          { valeur: '2 500+', label: 'véhicules disponibles' },
          { valeur: '48 h', label: 'délai de livraison moyen' },
          { valeur: '98 %', label: 'clients satisfaits' },
          { valeur: '10 villes', label: 'couvertes en Côte d'Ivoire' },
        ].map(({ valeur, label }) => (
          <div key={label} className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15">
            <p className="text-[22px] font-bold text-white">{valeur}</p>
            <p className="mt-0.5 text-[12px] text-white/70">{label}</p>
          </div>
        ))}
      </div>

      {/* Témoignage */}
      <figure className="relative">
        <svg viewBox="0 0 24 18" aria-hidden="true" className="mb-4 h-4 w-5 text-white/60">
          <path d="M0 18V10.5C0 4.6 3.1 1.1 9.2 0l1 2.6C6.6 3.6 5 5.7 4.9 8.6H9.6V18H0Zm14.4 0V10.5C14.4 4.6 17.5 1.1 23.6 0l1 2.6c-3.6 1-5.2 3.1-5.3 6h4.7V18h-9.6Z" fill="currentColor"/>
        </svg>
        <blockquote className="text-[18px] font-medium leading-[1.4] text-white">
          J'ai loué mon véhicule en 10 minutes depuis mon téléphone. Livraison le lendemain matin à Cocody.
        </blockquote>
        <figcaption className="mt-5 flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-white/20 text-[13px] font-semibold text-white ring-1 ring-white/30">
            AK
          </span>
          <span>
            <p className="text-[13px] font-medium text-white">Awa Koné</p>
            <p className="text-[12px] text-white/60">Cliente — Abidjan Plateau</p>
          </span>
        </figcaption>
      </figure>
    </div>
  );
}

// ─── Icônes fournisseurs ─────────────────────────────────────────────────────

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

// ─── Utilitaire ─────────────────────────────────────────────────────────────

function messageFriendly(supabaseMsg: string): string {
  if (supabaseMsg.includes('Invalid login credentials')) return 'E-mail ou mot de passe incorrect. Vérifiez et réessayez.';
  if (supabaseMsg.includes('Email not confirmed')) return 'Confirmez votre adresse e-mail avant de vous connecter.';
  if (supabaseMsg.includes('Too many requests')) return 'Trop de tentatives. Attendez quelques minutes et réessayez.';
  if (supabaseMsg.includes('User not found')) return 'Aucun compte avec cette adresse. Vérifiez ou inscrivez-vous.';
  return supabaseMsg;
}
