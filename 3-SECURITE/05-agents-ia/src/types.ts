export interface TacheIa { id: string; type: string; charge: unknown; }
export interface DecisionIa { action: "pass" | "flag" | "block"; confiance: number; motif?: string; }
