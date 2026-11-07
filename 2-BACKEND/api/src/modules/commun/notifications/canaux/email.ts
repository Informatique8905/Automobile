export async function envoyerEmail(destinataire: string, sujet: string, corps: string) { return { canal: "email", destinataire, sujet, corps }; }
