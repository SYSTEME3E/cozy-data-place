// Types pour le marché immobilier Nexora
export type TypeBien = "maison" | "terrain" | "appartement" | "boutique";
export type Statut = "disponible" | "vendu" | "loue";

export interface Annonce {
  _id: string;
  titre: string;
  description: string;
  prix: number;
  type: TypeBien;
  ville: string;
  quartier?: string;
  images: string[];
  contact: string;
  whatsapp?: string;
  statut: Statut;
  favoris: string[];
  auteurId: string;
  auteurNom: string;
  createdAt: string;
  updatedAt: string;
}

export interface Filtres {
  type?: TypeBien | "";
  ville?: string;
  prixMin?: string;
  prixMax?: string;
  statut?: Statut | "";
  search?: string;
}

export interface AnnonceFormData {
  titre: string;
  description: string;
  prix: string;
  type: TypeBien;
  ville: string;
  quartier: string;
  contact: string;
  whatsapp: string;
  statut: Statut;
  auteurId: string;
  auteurNom: string;
}
