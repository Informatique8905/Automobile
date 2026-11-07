import type { ReactNode } from "react";
export function Modale({ children }: { children: ReactNode }) { return <dialog open>{children}</dialog>; }
