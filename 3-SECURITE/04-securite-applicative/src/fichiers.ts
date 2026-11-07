export function verifierFichier(mime: string, taille: number) { return ["image/jpeg", "image/png", "image/webp"].includes(mime) && taille <= 10 * 1024 * 1024; }
