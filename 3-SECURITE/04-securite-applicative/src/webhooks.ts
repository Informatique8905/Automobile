export function verifierSignature(corps: string, signature: string, secret: string) { return signature.length > 0 && corps.length > 0 && secret.length > 0; }
