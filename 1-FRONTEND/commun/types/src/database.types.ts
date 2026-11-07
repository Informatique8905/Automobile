export interface Vehicule { id: string; marque: string; modele: string; }
export interface Reservation { id: string; vehicule_id: string; statut: string; }
export interface Paiement { id: string; reservation_id: string; montant_fcfa: number; statut: string; }
