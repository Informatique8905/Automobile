export async function appelerModele(prompt: string) { return { fournisseur: process.env.LLM_FOURNISSEUR ?? "aucun", prompt, reponse: null }; }
