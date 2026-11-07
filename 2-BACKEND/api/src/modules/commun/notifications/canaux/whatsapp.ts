export async function envoyerWhatsapp(destinataire: string, corps: string) { return { canal: "whatsapp", destinataire, corps }; }
