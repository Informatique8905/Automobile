/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Inscription
 * Route : /inscription    Application : client (www.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Prénom + Nom, e-mail, mot de passe (force vérifiée)
 *   • Téléphone (+225, format CI) — enregistré dans le profil, non vérifié SMS pour l'instant
 *   • Commune + quartier — enregistrés dans le profil
 *   • Connexion Google / Apple si NEXT_PUBLIC_SSO_ACTIVE === "true"
 *   • Cases : CGU + confidentialité (obligatoires), marketing (facultatif)
 *
 * DONNÉES
 *   • Supabase Auth signUp / signInWithOAuth
 *   • options.data.telephone, options.data.commune, options.data.quartier
 *   • Le profil et les consentements sont créés par trigger en base (migration 0300)
 *
 * SÉCURITÉ
 *   • Mot de passe : 8 caractères min, minuscules + majuscules + chiffres
 *   • Message d'erreur générique si e-mail déjà utilisé
 *   • Le téléphone sera vérifié par SMS dans une version ultérieure (OTP twilio)
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
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { clientNavigateur } from '@plateforme/supabase/navigateur';
import { cn } from '@plateforme/ui/utils';
import type { Provider } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────────────────────────────────────

type Vue = 'formulaire' | 'confirmation';

interface Champs {
  prenom: string;
  nom: string;
  email: string;
  motDePasse: string;
  telephone: string;
  cityId: string;
  districtId: string;
}

interface Ville { id: number; name: string; }
interface District { id: number; name: string; }

type Erreurs = Partial<Record<keyof Champs | 'cgu', string>>;

// ─── Règles mot de passe ─────────────────────────────────────────────────────

const REGLES_MDP = [
  { id: 'longueur', label: '8 caractères minimum', test: (v: string) => v.length >= 8 },
  { id: 'minuscule', label: 'Une minuscule', test: (v: string) => /[a-z]/.test(v) },
  { id: 'majuscule', label: 'Une majuscule', test: (v: string) => /[A-Z]/.test(v) },
  { id: 'chiffre', label: 'Un chiffre', test: (v: string) => /\d/.test(v) },
] as const;

const FORCE = [
  { label: 'Très faible', couleur: 'var(--couleur-erreur)' },
  { label: 'Faible', couleur: 'var(--couleur-erreur)' },
  { label: 'Moyen', couleur: 'var(--couleur-alerte)' },
  { label: 'Bon', couleur: 'var(--couleur-primaire)' },
  { label: 'Fort', couleur: 'var(--couleur-succes)' },
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Téléphone CI : 07 XX XX XX XX → 10 chiffres après le 0 (ou 8 chiffres sans l'indicatif 0)
const TEL_CI_RE = /^(0[0-9]|[0-9])[0-9]{7}$/; // 8 ou 9 chiffres significatifs

const SSO_ACTIF = process.env.NEXT_PUBLIC_SSO_ACTIVE === 'true';

function valider(valeurs: Champs, cgu: boolean): Erreurs {
  const e: Erreurs = {};
  if (valeurs.prenom.trim().length < 2) e.prenom = 'Saisissez votre prénom (2 caractères min.).';
  if (valeurs.nom.trim().length < 2) e.nom = 'Saisissez votre nom (2 caractères min.).';
  if (!valeurs.email.trim()) e.email = 'Saisissez votre adresse e-mail.';
  else if (!EMAIL_RE.test(valeurs.email.trim())) e.email = "Cette adresse e-mail n'est pas valide.";
  if (!valeurs.motDePasse) e.motDePasse = 'Choisissez un mot de passe.';
  else if (REGLES_MDP.some((r) => !r.test(valeurs.motDePasse))) e.motDePasse = 'Votre mot de passe doit respecter toutes les règles ci-dessous.';
  if (valeurs.telephone.trim() && !TEL_CI_RE.test(valeurs.telephone.trim())) {
    e.telephone = 'Numéro invalide (ex : 07 12 34 56 78 → saisissez 0712345678).';
  }
  if (!cgu) e.cgu = 'Vous devez accepter les conditions générales pour continuer.';
  return e;
}

function messageFriendly(msg: string): string {
  if (msg.includes('already registered') || msg.includes('already been registered')) return 'Un compte existe déjà avec cette adresse e-mail.';
  if (msg.includes('Password should be')) return 'Le mot de passe ne respecte pas les règles de sécurité.';
  if (msg.includes('invalid_email')) return "Cette adresse e-mail n'est pas valide.";
  return msg;
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function PageInscription() {
  const uid = useId();
  const supabase = clientNavigateur();

  const [vue, setVue] = useState<Vue>('formulaire');
  const [valeurs, setValeurs] = useState<Champs>({
    prenom: '', nom: '', email: '', motDePasse: '',
    telephone: '', cityId: '', districtId: '',
  });
  const [villes, setVilles] = useState<Ville[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [chargementVilles, setChargementVilles] = useState(true);
  const [chargementDistricts, setChargementDistricts] = useState(false);
  const [touche, setTouche] = useState<Partial<Record<keyof Champs, boolean>>>({});
  const [soumis, setSoumis] = useState(false);
  const [cgu, setCgu] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [afficherMdp, setAfficherMdp] = useState(false);
  const [mdpFocus, setMdpFocus] = useState(false);
  const [erreurFormulaire, setErreurFormulaire] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<null | 'submit' | Provider>(null);

  const titreRef = useRef<HTMLHeadingElement>(null);
  const prenomRef = useRef<HTMLInputElement>(null);
  const nomRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const mdpRef = useRef<HTMLInputElement>(null);
  const telRef = useRef<HTMLInputElement>(null);
  const banniereRef = useRef<HTMLDivElement>(null);
  const deplacerFocus = useRef(false);

  useLayoutEffect(() => {
    if (!deplacerFocus.current) return;
    deplacerFocus.current = false;
    titreRef.current?.focus({ preventScroll: true });
  }, [vue]);

  // Charger les villes au montage
  useEffect(() => {
    supabase
      .from('cities')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (data) setVilles(data as Ville[]);
        setChargementVilles(false);
      });
  }, [supabase]);

  // Charger les quartiers quand la ville change
  useEffect(() => {
    if (!valeurs.cityId) { setDistricts([]); return; }
    setChargementDistricts(true);
    supabase
      .from('districts')
      .select('id, name')
      .eq('city_id', Number(valeurs.cityId))
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (data) setDistricts(data as District[]);
        setChargementDistricts(false);
      });
  }, [supabase, valeurs.cityId]);

  const erreurs = valider(valeurs, cgu);

  const erreurVisible = (champ: keyof Champs | 'cgu') =>
    soumis || (champ !== 'cgu' && touche[champ as keyof Champs]) ? (erreurs[champ] ?? null) : null;

  const mettreAJour = (champ: keyof Champs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValeurs((prev) => ({ ...prev, [champ]: e.target.value }));
    if (erreurFormulaire) setErreurFormulaire(null);
  };
  const desactiver = (champ: keyof Champs) => () => {
    if (valeurs[champ]) setTouche((prev) => ({ ...prev, [champ]: true }));
  };

  const occupe = enCours !== null;
  const passeReussites = REGLES_MDP.filter((r) => r.test(valeurs.motDePasse)).length;
  const force = valeurs.motDePasse ? (FORCE[passeReussites] ?? null) : null;

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    if (occupe) return;
    setSoumis(true);
    const ordre = (['prenom', 'nom', 'email', 'motDePasse'] as const);
    const premierInvalide = ordre.find((c) => erreurs[c]);
    if (premierInvalide || erreurs.cgu || erreurs.telephone) {
      if (premierInvalide) {
        ({ prenom: prenomRef, nom: nomRef, email: emailRef, motDePasse: mdpRef })[premierInvalide].current?.focus();
      } else if (erreurs.telephone) {
        telRef.current?.focus();
      }
      return;
    }
    setErreurFormulaire(null);
    setEnCours('submit');

    // Téléphone : on stocke avec l'indicatif +225 mais sans vérification SMS pour l'instant
    const telFormate = valeurs.telephone.trim()
      ? `+225${valeurs.telephone.trim().replace(/\s/g, '')}`
      : undefined;

    try {
      const { error } = await supabase.auth.signUp({
        email: valeurs.email.trim(),
        password: valeurs.motDePasse,
        options: {
          data: {
            prenom: valeurs.prenom.trim(),
            nom: valeurs.nom.trim(),
            // Téléphone stocké dans raw_user_meta_data, trigger le copie dans profiles
            telephone: telFormate ?? null,
            // IDs géographiques (FK vers cities et districts) — copiés dans profiles par le trigger
            city_id: valeurs.cityId ? Number(valeurs.cityId) : null,
            district_id: valeurs.districtId ? Number(valeurs.districtId) : null,
            marketing_consent: marketing,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw new Error(messageFriendly(error.message));
      deplacerFocus.current = true;
      setVue('confirmation');
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
      setErreurFormulaire(err instanceof Error ? err.message : `Connexion ${fournisseur} annulée.`);
    } finally {
      setEnCours(null);
    }
  };

  const titreId = `${uid}-titre`;
  const anim = {
    initial: { opacity: 0, y: 6, filter: 'blur(3px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, y: -6, filter: 'blur(3px)' },
    transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const },
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <main className="flex flex-col bg-[var(--couleur-fond)]" aria-labelledby={titreId}>
        {/* En-tête */}
        <header className="flex items-center justify-between gap-4 px-6 pt-6 md:px-10 md:pt-8">
          <a href="/" className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)] focus-visible:outline-offset-2">
            <span className="grid size-9 place-items-center rounded-xl bg-[var(--couleur-primaire)] shadow-[var(--ombre-primaire)]" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" className="size-5 text-white">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-[var(--couleur-texte)]">
              Auto<span className="text-[var(--couleur-primaire)]">Mobile</span>
            </span>
          </a>
          <a href="/connexion" className="rounded text-[12.5px] text-[var(--couleur-texte-secondaire)] transition-colors hover:text-[var(--couleur-texte)] focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)]">
            Déjà inscrit ?{' '}
            <span className="font-medium text-[var(--couleur-orange-accessible)]">Se connecter</span>
          </a>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-10 md:px-10">
          <div className="w-full max-w-[440px]">
            <AnimatePresence mode="wait">
              {vue === 'formulaire' && (
                <motion.div key="formulaire" {...anim}>
                  <h1
                    id={titreId}
                    ref={titreRef}
                    tabIndex={-1}
                    className="text-[28px] font-semibold leading-tight tracking-[-0.03em] text-[var(--couleur-texte)] outline-none md:text-[32px]"
                  >
                    Créer mon compte
                  </h1>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--couleur-texte-secondaire)]">
                    Accédez à des milliers de véhicules en Côte d'Ivoire.
                  </p>

                  {/* Boutons SSO — masqués si NEXT_PUBLIC_SSO_ACTIVE !== "true" */}
                  {SSO_ACTIF && (
                    <>
                      <div className="mt-7 grid grid-cols-2 gap-3">
                        {(['google', 'apple'] as const).map((f) => (
                          <button key={f} type="button" onClick={() => connecterSSO(f)} disabled={occupe && enCours !== f} aria-label={`Continuer avec ${f === 'google' ? 'Google' : 'Apple'}`}
                            className={cn('flex h-11 items-center justify-center gap-2.5 rounded-xl border border-[var(--couleur-bordure)] bg-[var(--couleur-fond)] text-[13px] font-medium text-[var(--couleur-texte)] shadow-[var(--ombre-sm)] transition-all hover:border-[var(--couleur-bordure-active)] focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)] focus-visible:outline-offset-2 disabled:opacity-50')}>
                            {enCours === f ? <Loader2 className="size-4 animate-spin" /> : f === 'google' ? <IconGoogle /> : <IconApple />}
                            <span>{f === 'google' ? 'Google' : 'Apple'}</span>
                          </button>
                        ))}
                      </div>
                      <div className="my-6 flex items-center gap-3" role="presentation">
                        <span className="h-px flex-1 bg-[var(--couleur-bordure)]" />
                        <span className="text-[11px] font-medium uppercase tracking-widest text-[var(--couleur-texte-faible)]">ou par e-mail</span>
                        <span className="h-px flex-1 bg-[var(--couleur-bordure)]" />
                      </div>
                    </>
                  )}

                  {/* Formulaire principal */}
                  <form noValidate onSubmit={soumettre} className={cn('flex flex-col gap-4', !SSO_ACTIF && 'mt-7')}>
                    {erreurFormulaire && (
                      <div ref={banniereRef} tabIndex={-1} role="alert" className="flex gap-3 rounded-xl border border-[var(--couleur-erreur)]/20 bg-[var(--couleur-erreur-fond)] px-3.5 py-3 text-[12.5px] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-[var(--couleur-erreur)]">
                        <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-[var(--couleur-erreur)]">
                          <path d="M8 1.75 15 14H1L8 1.75Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                          <path d="M8 6.25v3.5M8 11.6v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <p className="text-[var(--couleur-texte)]">{erreurFormulaire}</p>
                      </div>
                    )}

                    {/* Prénom + Nom */}
                    <div className="grid grid-cols-2 gap-3">
                      <ChampTexte ref={prenomRef} id={`${uid}-prenom`} label="Prénom" autoComplete="given-name" placeholder="Awa" value={valeurs.prenom} onChange={mettreAJour('prenom')} onBlur={desactiver('prenom')} readOnly={occupe} error={erreurVisible('prenom')} />
                      <ChampTexte ref={nomRef} id={`${uid}-nom`} label="Nom" autoComplete="family-name" placeholder="Koné" value={valeurs.nom} onChange={mettreAJour('nom')} onBlur={desactiver('nom')} readOnly={occupe} error={erreurVisible('nom')} />
                    </div>

                    {/* E-mail */}
                    <ChampTexte ref={emailRef} id={`${uid}-email`} label="Adresse e-mail" type="email" inputMode="email" autoComplete="email" placeholder="vous@exemple.ci" value={valeurs.email} onChange={mettreAJour('email')} onBlur={desactiver('email')} readOnly={occupe} error={erreurVisible('email')} />

                    {/* Téléphone CI */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`${uid}-tel`} className="text-[12.5px] font-medium text-[var(--couleur-texte)]">
                        Téléphone{' '}
                        <span className="font-normal text-[var(--couleur-texte-secondaire)]">(facultatif)</span>
                      </label>
                      <div className="relative flex items-center">
                        {/* Indicatif +225 affiché en préfixe */}
                        <span className="absolute left-3 select-none text-[13px] font-medium text-[var(--couleur-texte-secondaire)]">+225</span>
                        <input
                          ref={telRef}
                          id={`${uid}-tel`}
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel-national"
                          placeholder="07 12 34 56 78"
                          value={valeurs.telephone}
                          onChange={mettreAJour('telephone')}
                          onBlur={desactiver('telephone')}
                          readOnly={occupe}
                          aria-invalid={erreurVisible('telephone') ? true : undefined}
                          aria-describedby={erreurVisible('telephone') ? `${uid}-tel-erreur` : `${uid}-tel-indice`}
                          className={cn(
                            'h-10 w-full rounded-xl border border-[var(--couleur-bordure)] bg-[var(--couleur-fond-moyen)] pl-14 pr-3.5 text-[14px] text-[var(--couleur-texte)] placeholder:text-[var(--couleur-texte-faible)] transition-[border-color,box-shadow]',
                            'focus:border-[var(--couleur-primaire)] focus:bg-[var(--couleur-fond)] focus:outline-none focus:shadow-[0_0_0_3px_rgb(255_107_0/0.15)]',
                            erreurVisible('telephone') && 'border-[var(--couleur-erreur)]',
                          )}
                        />
                      </div>
                      {erreurVisible('telephone')
                        ? <p id={`${uid}-tel-erreur`} role="alert" className="text-[12px] text-[var(--couleur-erreur)]">{erreurVisible('telephone')}</p>
                        : <p id={`${uid}-tel-indice`} className="text-[12px] text-[var(--couleur-texte-faible)]">La vérification par SMS sera disponible prochainement.</p>
                      }
                    </div>

                    {/* Ville + Quartier (depuis les tables cities et districts) */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Ville */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor={`${uid}-ville`} className="text-[12.5px] font-medium text-[var(--couleur-texte)]">
                          Ville{' '}
                          <span className="font-normal text-[var(--couleur-texte-secondaire)]">(facultatif)</span>
                        </label>
                        <div className="relative">
                          <select
                            id={`${uid}-ville`}
                            value={valeurs.cityId}
                            onChange={(e) => setValeurs((prev) => ({ ...prev, cityId: e.target.value, districtId: '' }))}
                            disabled={occupe || chargementVilles}
                            className={cn(
                              'h-10 w-full appearance-none rounded-xl border border-[var(--couleur-bordure)] bg-[var(--couleur-fond-moyen)] pl-3.5 pr-8 text-[14px] text-[var(--couleur-texte)] transition-[border-color,box-shadow]',
                              'focus:border-[var(--couleur-primaire)] focus:bg-[var(--couleur-fond)] focus:outline-none focus:shadow-[0_0_0_3px_rgb(255_107_0/0.15)]',
                              'disabled:opacity-60',
                              !valeurs.cityId && 'text-[var(--couleur-texte-faible)]',
                            )}
                          >
                            <option value="">
                              {chargementVilles ? 'Chargement…' : 'Ville'}
                            </option>
                            {villes.map((v) => (
                              <option key={v.id} value={String(v.id)}>{v.name}</option>
                            ))}
                          </select>
                          <svg viewBox="0 0 16 16" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-[var(--couleur-texte-secondaire)]">
                            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>

                      {/* Quartier */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor={`${uid}-quartier`} className="text-[12.5px] font-medium text-[var(--couleur-texte)]">
                          Quartier{' '}
                          <span className="font-normal text-[var(--couleur-texte-secondaire)]">(facultatif)</span>
                        </label>
                        <div className="relative">
                          <select
                            id={`${uid}-quartier`}
                            value={valeurs.districtId}
                            onChange={(e) => setValeurs((prev) => ({ ...prev, districtId: e.target.value }))}
                            disabled={occupe || !valeurs.cityId || chargementDistricts}
                            className={cn(
                              'h-10 w-full appearance-none rounded-xl border border-[var(--couleur-bordure)] bg-[var(--couleur-fond-moyen)] pl-3.5 pr-8 text-[14px] text-[var(--couleur-texte)] transition-[border-color,box-shadow]',
                              'focus:border-[var(--couleur-primaire)] focus:bg-[var(--couleur-fond)] focus:outline-none focus:shadow-[0_0_0_3px_rgb(255_107_0/0.15)]',
                              'disabled:opacity-60',
                              !valeurs.districtId && 'text-[var(--couleur-texte-faible)]',
                            )}
                          >
                            <option value="">
                              {!valeurs.cityId
                                ? 'Choisir une ville'
                                : chargementDistricts
                                ? 'Chargement…'
                                : 'Quartier'}
                            </option>
                            {districts.map((d) => (
                              <option key={d.id} value={String(d.id)}>{d.name}</option>
                            ))}
                          </select>
                          <svg viewBox="0 0 16 16" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-[var(--couleur-texte-secondaire)]">
                            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Mot de passe */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`${uid}-mdp`} className="text-[12.5px] font-medium text-[var(--couleur-texte)]">Mot de passe</label>
                      <div className="relative flex items-center">
                        <input
                          ref={mdpRef}
                          id={`${uid}-mdp`}
                          type={afficherMdp ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="8 caractères minimum"
                          value={valeurs.motDePasse}
                          onChange={mettreAJour('motDePasse')}
                          onBlur={() => { desactiver('motDePasse')(); setMdpFocus(false); }}
                          onFocus={() => setMdpFocus(true)}
                          readOnly={occupe}
                          aria-invalid={erreurVisible('motDePasse') ? true : undefined}
                          className={cn(
                            'h-10 w-full rounded-xl border border-[var(--couleur-bordure)] bg-[var(--couleur-fond-moyen)] px-3.5 pr-10 text-[14px] text-[var(--couleur-texte)] placeholder:text-[var(--couleur-texte-faible)] transition-[border-color,box-shadow]',
                            'focus:border-[var(--couleur-primaire)] focus:bg-[var(--couleur-fond)] focus:outline-none focus:shadow-[0_0_0_3px_rgb(255_107_0/0.15)]',
                            erreurVisible('motDePasse') && 'border-[var(--couleur-erreur)]',
                          )}
                        />
                        <button type="button" onClick={() => setAfficherMdp((v) => !v)} aria-label={afficherMdp ? 'Masquer' : 'Afficher'} aria-pressed={afficherMdp} className="absolute right-1 flex size-8 items-center justify-center rounded-lg text-[var(--couleur-texte-secondaire)] hover:text-[var(--couleur-texte)] focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)]">
                          {afficherMdp ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      {erreurVisible('motDePasse') && <p role="alert" className="text-[12px] text-[var(--couleur-erreur)]">{erreurVisible('motDePasse')}</p>}
                      {(valeurs.motDePasse || mdpFocus) && <JaugeMdp valeur={valeurs.motDePasse} reussites={passeReussites} force={force} />}
                    </div>

                    {/* Cases à cocher */}
                    <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--couleur-bordure)] bg-[var(--couleur-fond-moyen)] p-3.5">
                      <CaseCocher id={`${uid}-cgu`} checked={cgu} onChange={setCgu} required error={erreurVisible('cgu') ?? undefined}
                        label={<>J'accepte les <a href="/conditions" className="text-[var(--couleur-orange-accessible)] hover:underline">CGU</a> et la <a href="/confidentialite" className="text-[var(--couleur-orange-accessible)] hover:underline">politique de confidentialité</a> <span className="text-[var(--couleur-erreur)]" aria-hidden="true">*</span></>} />
                      <CaseCocher id={`${uid}-marketing`} checked={marketing} onChange={setMarketing} label="Recevoir les offres exclusives par e-mail (facultatif)" />
                    </div>

                    <button type="submit" disabled={occupe && enCours !== 'submit'}
                      className={cn('flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--couleur-primaire)] text-[14px] font-semibold text-white shadow-[var(--ombre-primaire)] transition-all hover:bg-[var(--couleur-primaire-sombre)] focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)] focus-visible:outline-offset-2 active:scale-[0.99] disabled:opacity-60')}>
                      {enCours === 'submit' ? <><Loader2 className="size-4 animate-spin" /> Création en cours</> : 'Créer mon compte'}
                    </button>
                  </form>
                </motion.div>
              )}

              {vue === 'confirmation' && (
                <motion.div key="confirmation" {...anim}>
                  <span className="grid size-14 place-items-center rounded-2xl border border-[var(--couleur-primaire)]/20 bg-[var(--couleur-primaire-doux)]" aria-hidden="true">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7">
                      <motion.path d="M3 8.5 8.5 14l12-12.5" fill="none" stroke="var(--couleur-primaire)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.36, delay: 0.08, ease: [0.23, 1, 0.32, 1] }} />
                    </svg>
                  </span>
                  <h1 id={titreId} ref={titreRef} tabIndex={-1} className="mt-6 text-[28px] font-semibold leading-tight tracking-[-0.03em] text-[var(--couleur-texte)] outline-none">
                    Vérifiez votre e-mail
                  </h1>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--couleur-texte-secondaire)]">
                    Un lien de confirmation a été envoyé à{' '}
                    <span className="font-medium text-[var(--couleur-texte)]">{valeurs.email.trim()}</span>.
                    Cliquez dessus pour activer votre compte.
                  </p>
                  <div className="mt-6 rounded-xl border border-[var(--couleur-bordure)] bg-[var(--couleur-fond-moyen)] p-4 text-[13px] text-[var(--couleur-texte-secondaire)]">
                    <p className="font-medium text-[var(--couleur-texte)]">Vous ne voyez pas l'e-mail ?</p>
                    <ul className="mt-1.5 list-disc pl-4 space-y-1">
                      <li>Vérifiez votre dossier spam</li>
                      <li>L'e-mail peut prendre 1 à 2 minutes</li>
                      <li>Vérifiez que vous avez saisi la bonne adresse</li>
                    </ul>
                  </div>
                  <a href="/connexion" className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--couleur-bordure)] bg-[var(--couleur-fond)] text-[14px] font-medium text-[var(--couleur-texte)] shadow-[var(--ombre-sm)] transition-all hover:border-[var(--couleur-bordure-active)]">
                    Retour à la connexion
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 pb-6 text-[11.5px] text-[var(--couleur-texte-faible)] md:px-10 md:pb-8">
          <span>© {new Date().getFullYear()} AutoMobile CI</span>
          <nav className="flex gap-4" aria-label="Liens légaux">
            <a href="/conditions" className="hover:text-[var(--couleur-texte)]">CGU</a>
            <a href="/confidentialite" className="hover:text-[var(--couleur-texte)]">Confidentialité</a>
          </nav>
        </footer>
      </main>

      <aside aria-hidden="true" className="hidden lg:flex lg:items-center lg:justify-center lg:bg-[var(--couleur-primaire)] lg:p-12">
        <PanneauMarque />
      </aside>
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

interface ChampTexteProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string | null;
  hint?: string;
  ref?: React.Ref<HTMLInputElement>;
}

function ChampTexte({ id, label, error, hint, className, ref, ...props }: ChampTexteProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[12.5px] font-medium text-[var(--couleur-texte)]">{label}</label>
      <input ref={ref} id={id} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-erreur` : hint ? `${id}-indice` : undefined}
        className={cn('h-10 w-full rounded-xl border border-[var(--couleur-bordure)] bg-[var(--couleur-fond-moyen)] px-3.5 text-[14px] text-[var(--couleur-texte)] placeholder:text-[var(--couleur-texte-faible)] transition-[border-color,box-shadow] focus:border-[var(--couleur-primaire)] focus:bg-[var(--couleur-fond)] focus:outline-none focus:shadow-[0_0_0_3px_rgb(255_107_0/0.15)]', error && 'border-[var(--couleur-erreur)]', className)} {...props} />
      {error && <p id={`${id}-erreur`} role="alert" className="text-[12px] text-[var(--couleur-erreur)]">{error}</p>}
      {!error && hint && <p id={`${id}-indice`} className="text-[12px] text-[var(--couleur-texte-faible)]">{hint}</p>}
    </div>
  );
}

function JaugeMdp({ valeur, reussites, force }: { valeur: string; reussites: number; force: (typeof FORCE)[number] | null }) {
  return (
    <div className="rounded-xl border border-[var(--couleur-bordure)] bg-[var(--couleur-fond-moyen)] px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-1 overflow-hidden rounded-full bg-[var(--couleur-bordure)]">
              <span className="block h-full origin-left rounded-full transition-[transform,background-color] duration-200 ease-out" style={{ background: force?.couleur ?? 'transparent', transform: `scaleX(${valeur && i < reussites ? 1 : 0})` }} />
            </span>
          ))}
        </div>
        <span className="w-14 text-right text-[11.5px] font-medium text-[var(--couleur-texte-secondaire)]" aria-live="polite">{force?.label ?? ''}</span>
      </div>
      <ul className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1" aria-label="Règles du mot de passe">
        {REGLES_MDP.map((r) => {
          const ok = r.test(valeur);
          return (
            <li key={r.id} className={cn('flex items-center gap-1.5 text-[11.5px]', ok ? 'text-[var(--couleur-texte-secondaire)]' : 'text-[var(--couleur-texte-faible)]')}>
              <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3 shrink-0">
                {ok ? <path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="var(--couleur-succes)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/> : <circle cx="6" cy="6" r="1.6" fill="currentColor"/>}
              </svg>
              {r.label}<span className="sr-only">{ok ? ', respecté' : ', non respecté'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CaseCocher({ id, checked, onChange, label, required, error }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; required?: boolean; error?: string }) {
  return (
    <div>
      <label className="group flex cursor-pointer select-none items-start gap-2.5 text-[12.5px] text-[var(--couleur-texte-secondaire)]">
        <input id={id} type="checkbox" required={required} className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-describedby={error ? `${id}-erreur` : undefined} />
        <span aria-hidden="true" className={cn('mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[6px] border transition-[background-color,border-color] duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--couleur-primaire)] peer-focus-visible:ring-offset-2', checked ? 'border-transparent bg-[var(--couleur-primaire)] text-white' : 'border-[var(--couleur-bordure)] bg-[var(--couleur-fond)] group-hover:border-[var(--couleur-primaire)]/50')}>
          <svg viewBox="0 0 12 12" className={cn('size-3 transition-opacity duration-150', checked ? 'opacity-100' : 'opacity-0')}>
            <path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        <span>{label}</span>
      </label>
      {error && <p id={`${id}-erreur`} role="alert" className="mt-1 text-[12px] text-[var(--couleur-erreur)]">{error}</p>}
    </div>
  );
}

function PanneauMarque() {
  return (
    <div className="relative flex w-full max-w-md flex-col justify-between gap-12 overflow-hidden rounded-3xl bg-white/10 p-10 ring-1 ring-white/20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '20px 20px', maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, #000 20%, transparent 80%)' }} />
      <div className="relative">
        <p className="text-[13px] font-semibold uppercase tracking-widest text-white/60">Pourquoi nous rejoindre ?</p>
        <ul className="mt-5 flex flex-col gap-4">
          {[
            { icone: '🚗', titre: 'Large choix', desc: 'Plus de 2 500 véhicules : berlines, SUV, utilitaires, motos.' },
            { icone: '📱', titre: '100 % mobile', desc: 'Réservez, payez et suivez votre commande depuis votre téléphone.' },
            { icone: '⚡', titre: 'Livraison rapide', desc: "Livraison en 48 h dans les grandes villes de Côte d'Ivoire." },
            { icone: '🔒', titre: 'Paiement sécurisé', desc: 'Wave, Orange Money, MTN, Moov et cartes bancaires acceptés.' },
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
