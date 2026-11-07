export async function envoyerSms(destinataire: string, corps: string) { return { canal: "sms", destinataire, corps }; }
