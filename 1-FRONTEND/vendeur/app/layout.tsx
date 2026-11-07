import type { Metadata } from "next";
import type { ReactNode } from "react";
export const metadata: Metadata = { title: "Espace partenaire", robots: { index: false, follow: false } };
export default function Layout({ children }: { children: ReactNode }) { return <html lang="fr"><body>{children}</body></html>; }
