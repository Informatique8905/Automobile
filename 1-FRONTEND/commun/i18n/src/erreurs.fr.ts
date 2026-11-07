export const erreurs = {
  VEHICULE_INDISPONIBLE: "Ce véhicule n'est plus disponible aux dates choisies.",
  PAIEMENT_NON_CONFIRME: "Le paiement n'a pas encore été confirmé.",
  IDENTITE_NON_VERIFIEE: "Votre identité doit être vérifiée avant cette action.",
  ACCES_REFUSE: "Vous n'avez pas accès à cette ressource.",
} as const;

export type CodeErreur = keyof typeof erreurs;
export const traduireErreur = (code: string) => erreurs[code as CodeErreur] ?? "Une erreur est survenue. Réessayez.";
