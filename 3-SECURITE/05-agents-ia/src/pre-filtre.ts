export function preFiltrer(texte: string) { return { autorise: !/mot de passe|carte bancaire/i.test(texte), motifs: [] as string[] }; }
