/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAGE · Activation de la double authentification
 * Route : /activer-2fa    Application : administrateur (admin.)
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENU
 *   • Enrôlement TOTP via mfa.enroll({ factorType: 'totp' })
 *   • Affichage du QR code (data URI SVG) et de la clé secrète en clair
 *   • Saisie du code à 6 chiffres pour confirmer l'enrôlement
 *   • Redirection vers /tableau-de-bord après succès (session élevée à aal2)
 *
 * SÉCURITÉ
 *   • Le middleware garantit que seul un utilisateur aal1 sans facteur peut
 *     accéder à cette page. Un utilisateur déjà aal2 est redirigé.
 * ═══════════════════════════════════════════════════════════════════════════
 */
'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { clientNavigateur } from '@plateforme/supabase/navigateur';
import { cn } from '@plateforme/ui/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

type Etape = 'chargement' | 'scanner' | 'succes' | 'erreur-chargement';

// ─── Constantes ─────────────────────────────────────────────────────────────

const LONGUEUR_CODE = 6;

// ─── Composant principal ─────────────────────────────────────────────────────

export default function PageActiver2FA() {
  const uid = useId();
  const supabase = clientNavigateur();

  const [etape, setEtape] = useState<Etape>('chargement');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [copie, setCopie] = useState(false);

  const banniereRef = useRef<HTMLDivElement>(null);

  // Enrôler le facteur TOTP dès le montage
  useEffect(() => {
    let annule = false;

    const enrollerTOTP = async () => {
      // Supprimer les facteurs TOTP non vérifiés laissés par une tentative précédente
      // pour éviter l'erreur « factor already exists » au rechargement de la page.
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      if (factorsData?.totp) {
        const nonVerifies = factorsData.totp.filter((f) => (f.status as string) === 'unverified');
        await Promise.all(nonVerifies.map((f) => supabase.auth.mfa.unenroll({ factorId: f.id })));
      }
      if (annule) return;

      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (annule) return;
      if (error || !data) {
        setEtape('erreur-chargement');
        return;
      }
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setEtape('scanner');
    };

    void enrollerTOTP();
    return () => { annule = true; };
  }, [supabase]);

  const verifier = async () => {
    if (code.length !== LONGUEUR_CODE || enCours) return;
    setEnCours(true);
    setErreur(null);

    try {
      // 1. Créer un défi
      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeErr || !challengeData) throw new Error('Impossible de créer le défi. Réessayez.');

      // 2. Vérifier le code
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });
      if (verifyErr) throw new Error("Code incorrect ou expiré. Vérifiez l'heure de votre appareil et réessayez.");

      // Succès → session élevée à aal2
      setEtape('succes');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Une erreur est survenue.';
      setErreur(msg);
      setCode('');
      window.requestAnimationFrame(() => banniereRef.current?.focus({ preventScroll: false }));
    } finally {
      setEnCours(false);
    }
  };

  const copierSecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 2000);
    } catch {
      /* Clipboard non disponible */
    }
  };

  const transition = {
    initial: { opacity: 0, y: 6, filter: 'blur(3px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const },
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--couleur-fond)] px-6 py-12">
      <div className="w-full max-w-[400px]">

        {/* ── Chargement ── */}
        {etape === 'chargement' && (
          <div className="flex flex-col items-center gap-4 py-16 text-[var(--couleur-texte-secondaire)]">
            <Loader2 className="size-8 animate-spin text-[var(--couleur-primaire)]" aria-hidden="true" />
            <p className="text-[13.5px]">Préparation de la configuration…</p>
          </div>
        )}

        {/* ── Erreur de chargement ── */}
        {etape === 'erreur-chargement' && (
          <motion.div {...transition} className="flex flex-col items-start gap-4">
            <span className="grid size-14 place-items-center rounded-2xl border border-[var(--couleur-erreur)]/30 bg-[var(--couleur-erreur-fond)]" aria-hidden="true">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7 text-[var(--couleur-erreur)]">
                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <h1 className="text-[26px] font-semibold tracking-tight text-[var(--couleur-texte)]">
              Échec de la configuration
            </h1>
            <p className="text-[13.5px] leading-relaxed text-[var(--couleur-texte-secondaire)]">
              Impossible de préparer la double authentification. Reconnectez-vous et réessayez.
            </p>
            <a
              href="/connexion"
              className="mt-2 flex h-11 w-full items-center justify-center rounded-xl bg-[var(--couleur-primaire)] text-[14px] font-semibold text-white shadow-[var(--ombre-primaire)] transition-all hover:bg-[var(--couleur-primaire-sombre)]"
            >
              Retour à la connexion
            </a>
          </motion.div>
        )}

        {/* ── Scanner le QR code + saisir le code ── */}
        {etape === 'scanner' && (
          <motion.div {...transition}>
            {/* Logo + titre */}
            <div className="mb-8 flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-[var(--couleur-primaire)] shadow-[var(--ombre-primaire)]" aria-hidden="true">
                <ShieldCheck className="size-5 text-white" />
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-[var(--couleur-texte)]">
                Auto<span className="text-[var(--couleur-primaire)]">Mobile</span>{' '}
                <span className="font-normal text-[var(--couleur-texte-secondaire)]">Admin</span>
              </span>
            </div>

            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[var(--couleur-texte)]">
              Activez la double authentification
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--couleur-texte-secondaire)]">
              L'accès à l'administration exige un second facteur TOTP. Scannez le code QR avec une application comme{' '}
              <span className="font-medium text-[var(--couleur-texte)]">Google Authenticator</span> ou{' '}
              <span className="font-medium text-[var(--couleur-texte)]">Authy</span>.
            </p>

            {/* QR code */}
            <div className="mt-7 flex flex-col items-center gap-4">
              <div className="rounded-2xl border border-[var(--couleur-bordure)] bg-white p-3 shadow-[var(--ombre)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCode}
                  alt="QR code TOTP à scanner avec votre application d'authentification"
                  width={180}
                  height={180}
                  className="block"
                />
              </div>

              {/* Clé secrète manuelle */}
              <div className="w-full">
                <p className="mb-1.5 text-[12px] font-medium text-[var(--couleur-texte-secondaire)]">
                  Ou saisissez la clé manuellement
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto rounded-xl border border-[var(--couleur-bordure)] bg-[var(--couleur-fond-moyen)] px-3.5 py-2.5 font-mono text-[12px] tracking-widest text-[var(--couleur-texte)] select-all">
                    {secret}
                  </code>
                  <button
                    type="button"
                    onClick={copierSecret}
                    aria-label={copie ? 'Clé copiée' : 'Copier la clé secrète'}
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all',
                      copie
                        ? 'border-[var(--couleur-succes)]/30 bg-[var(--couleur-succes-fond)] text-[var(--couleur-succes)]'
                        : 'border-[var(--couleur-bordure)] bg-[var(--couleur-fond-moyen)] text-[var(--couleur-texte-secondaire)] hover:text-[var(--couleur-texte)]',
                      'focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)]',
                    )}
                  >
                    {copie ? (
                      <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
                        <path d="M3 8.5 6.5 12l6.5-7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
                        <rect x="5.5" y="5.5" width="8" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3"/>
                        <path d="M3.5 10.5H3A1.5 1.5 0 0 1 1.5 9V3A1.5 1.5 0 0 1 3 1.5h6A1.5 1.5 0 0 1 10.5 3v2.5" fill="none" stroke="currentColor" strokeWidth="1.3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Saisie du code de confirmation */}
            <div className="mt-7">
              <p className="mb-5 text-[13.5px] text-[var(--couleur-texte-secondaire)]">
                Une fois votre application configurée, saisissez le code à 6 chiffres affiché pour confirmer.
              </p>

              {erreur && (
                <div
                  ref={banniereRef}
                  tabIndex={-1}
                  role="alert"
                  className="mb-4 flex gap-3 rounded-xl border border-[var(--couleur-erreur)]/20 bg-[var(--couleur-erreur-fond)] px-3.5 py-3 text-[12.5px] leading-relaxed text-[var(--couleur-texte)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--couleur-erreur)]"
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-[var(--couleur-erreur)]">
                    <path d="M8 1.75 15 14H1L8 1.75Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                    <path d="M8 6.25v3.5M8 11.6v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <p>{erreur}</p>
                </div>
              )}

              <form
                noValidate
                onSubmit={(e) => { e.preventDefault(); void verifier(); }}
              >
                <label htmlFor={`${uid}-code`} className="text-[12.5px] font-medium text-[var(--couleur-texte)]">
                  Code de vérification
                </label>
                <div className="relative mt-1.5">
                  {/* Input invisible — capte la saisie */}
                  <input
                    id={`${uid}-code`}
                    value={code}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, LONGUEUR_CODE);
                      setCode(val);
                      setErreur(null);
                      if (val.length === LONGUEUR_CODE) void verifier();
                    }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={LONGUEUR_CODE}
                    readOnly={enCours}
                    aria-invalid={erreur ? true : undefined}
                    className="absolute inset-0 z-10 w-full cursor-text bg-transparent font-mono text-transparent caret-transparent opacity-0 outline-none"
                  />
                  {/* Affichage visuel des cases */}
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
                        {enCours && i < code.length ? (
                          <Loader2 className="size-4 animate-spin text-[var(--couleur-texte-secondaire)]" aria-hidden="true" />
                        ) : (
                          code[i] ?? ''
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={code.length !== LONGUEUR_CODE || enCours}
                  className={cn(
                    'mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--couleur-primaire)] text-[14px] font-semibold text-white shadow-[var(--ombre-primaire)] transition-all',
                    'hover:bg-[var(--couleur-primaire-sombre)]',
                    'focus-visible:outline-2 focus-visible:outline-[var(--couleur-primaire)] focus-visible:outline-offset-2',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                  )}
                >
                  {enCours
                    ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Vérification…</>
                    : 'Activer la double authentification'}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* ── Succès ── */}
        {etape === 'succes' && (
          <motion.div {...transition} className="flex flex-col items-start">
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
            <h1 className="mt-6 text-[26px] font-semibold leading-tight tracking-tight text-[var(--couleur-texte)]">
              Double authentification activée
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--couleur-texte-secondaire)]">
              Votre compte est maintenant sécurisé. Vous serez invité à saisir un code à chaque connexion.
            </p>
            <a
              href="/tableau-de-bord"
              className={cn(
                'mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--couleur-primaire)] text-[14px] font-semibold text-white shadow-[var(--ombre-primaire)] transition-all',
                'hover:bg-[var(--couleur-primaire-sombre)]',
              )}
            >
              Accéder au tableau de bord
              <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
                <path d="M3.5 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </motion.div>
        )}

      </div>
    </div>
  );
}
