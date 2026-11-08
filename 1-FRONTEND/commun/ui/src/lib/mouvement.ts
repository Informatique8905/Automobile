/**
 * MOUVEMENT — valeurs et helpers d'animation partagés (charte UX)
 * ═══════════════════════════════════════════════════════════════════
 * Référence : docs/PROMPT_SUITE_DEVELOPPEMENT.md §6.
 * - `motion` pour les interfaces, `gsap` uniquement pour le carrousel d'accueil ;
 * - n'animer que transform / opacity / filter ;
 * - « réduire les animations » → fondus courts de 120 ms.
 * ═══════════════════════════════════════════════════════════════════
 */
import { useSyncExternalStore } from 'react';

/** Courbe principale des micro-interactions et changements d'écran. */
export const COURBE = [0.23, 1, 0.32, 1] as const;

/** Durées de référence en secondes. */
export const DUREES = {
  micro: 0.15,
  etat: 0.24,
  panneau: 0.28,
  entree: 0.24,
  succes: 0.4,
  reduit: 0.12,
} as const;

const REQUETE_REDUCTION = '(prefers-reduced-motion: reduce)';

function sAbonnerChangements(ecouter: () => void) {
  if (typeof window === 'undefined') return () => {};
  const media = window.matchMedia(REQUETE_REDUCTION);
  media.addEventListener('change', ecouter);
  return () => media.removeEventListener('change', ecouter);
}

function lireReduction() {
  return typeof window !== 'undefined' && window.matchMedia(REQUETE_REDUCTION).matches;
}

function lireReductionServeur() {
  return false;
}

/** true si l'utilisateur a demandé moins d'animations. */
export function useMouvementReduit(): boolean {
  return useSyncExternalStore(sAbonnerChangements, lireReduction, lireReductionServeur);
}

/** Entrée d'un écran ou d'un contenu : fondu + léger décalage + flou. */
export function transitionEntree(reduit = false) {
  const y = reduit ? 0 : 6;
  const flou = reduit ? 'blur(0px)' : 'blur(3px)';
  return {
    initial: { opacity: 0, y, filter: flou },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, y: -y, filter: flou },
    transition: { duration: reduit ? DUREES.reduit : DUREES.entree, ease: COURBE },
  };
}

/** Tracé de la coche de succès (400 ms, ou fondu court si animations réduites). */
export function transitionSucces(reduit = false) {
  return { duration: reduit ? DUREES.reduit : DUREES.succes, delay: reduit ? 0 : 0.08, ease: COURBE };
}
