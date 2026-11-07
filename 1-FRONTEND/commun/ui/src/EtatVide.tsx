import type { ReactNode } from "react";
export function EtatVide({ children }: { children?: ReactNode }) { return <p>{children ?? "Aucun résultat"}</p>; }
