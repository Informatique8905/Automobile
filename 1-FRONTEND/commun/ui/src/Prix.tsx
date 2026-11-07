export function Prix({ montant }: { montant: number }) { return <span>{new Intl.NumberFormat("fr-FR").format(montant)} FCFA</span>; }
