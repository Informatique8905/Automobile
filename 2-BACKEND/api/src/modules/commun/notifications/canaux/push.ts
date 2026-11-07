export async function envoyerPush(destinataire: string, corps: string) { return { canal: "push", destinataire, corps }; }
