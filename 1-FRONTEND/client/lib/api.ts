export async function api<T>(chemin: string, jeton?: string): Promise<T> {
  const reponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003"}${chemin}`, {
    headers: { "content-type": "application/json", ...(jeton ? { authorization: `Bearer ${jeton}` } : {}) },
  });
  if (!reponse.ok) throw new Error(`API ${reponse.status}`);
  return reponse.json() as Promise<T>;
}
