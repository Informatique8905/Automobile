import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Automobile", description: "Location et vente de véhicules en Côte d'Ivoire" };
export default function Layout({ children }: { children: ReactNode }) { return <html lang="fr"><body>{children}</body></html>; }
