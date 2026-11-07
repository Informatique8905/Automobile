import { api } from "@auto/client/lib/api";
export async function appelerApi<T>(chemin: string, jeton?: string) { return api<T>(chemin, jeton); }
