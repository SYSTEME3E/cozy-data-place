/**
 * NEXORA — Modal Détails Produit Physique
 * Affiche les variations enrichies : couleurs, tailles, matières, etc.
 */

import { X, Palette, Ruler, Package, Info, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export interface VariationDetail {
  id: string;
  nom: string;
  type_variation?: string | null;
  valeur_principale?: string | null;
  code_couleur?: string | null;
  description?: string | null;
  image_url?: string | null;
  stock_disponible?: number | null;
  prix_supplement?: number | null;
  valeurs?: any;
}

interface ProduitDetailsModalProps {
  open: boolean;
  onClose: () => void;
  produitNom: string;
  produitDimensions?: string | null;
  produitPoids?: string | null;
  produitSku?: string | null;
  variations: VariationDetail[];
  devise?: string;
}

const TYPE_ICONS: Record<string, any> = {
  couleur: Palette,
  taille: Ruler,
  matiere: Layers,
  dimension: Package,
  autre: Info,
};

const TYPE_LABELS: Record<string, string> = {
  couleur: "Couleur",
  taille: "Taille",
  matiere: "Matière",
  dimension: "Dimension",
  autre: "Détail",
};

export default function ProduitDetailsModal({
  open,
  onClose,
  produitNom,
  produitDimensions,
  produitPoids,
  produitSku,
  variations,
  devise = "XOF",
}: ProduitDetailsModalProps) {
  // Grouper par type de variation
  const grouped = variations.reduce<Record<string, VariationDetail[]>>((acc, v) => {
    const type = v.type_variation || "autre";
    if (!acc[type]) acc[type] = [];
    acc[type].push(v);
    return acc;
  }, {});

  const hasInfoBase = produitDimensions || produitPoids || produitSku;
  const hasVariations = variations.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0 gap-0 bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-5 py-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base font-bold text-foreground truncate">
              Détails du produit
            </DialogTitle>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{produitNom}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
          >
            <X size={18} className="text-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {!hasInfoBase && !hasVariations && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Aucun détail supplémentaire disponible pour ce produit.
            </div>
          )}

          {/* Informations de base */}
          {hasInfoBase && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Info size={16} className="text-primary" />
                Caractéristiques
              </h3>
              <div className="bg-muted/40 rounded-xl p-3 space-y-2">
                {produitDimensions && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dimensions</span>
                    <span className="font-medium text-foreground">{produitDimensions}</span>
                  </div>
                )}
                {produitPoids && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Poids</span>
                    <span className="font-medium text-foreground">{produitPoids}</span>
                  </div>
                )}
                {produitSku && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Référence (SKU)</span>
                    <span className="font-mono text-xs text-foreground">{produitSku}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Variations groupées par type */}
          {Object.entries(grouped).map(([type, items]) => {
            const Icon = TYPE_ICONS[type] || Info;
            const label = TYPE_LABELS[type] || "Détail";
            return (
              <div key={type} className="space-y-2">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Icon size={16} className="text-primary" />
                  {label}{items.length > 1 ? "s disponibles" : ""}
                </h3>
                <div className="space-y-2">
                  {items.map((v) => (
                    <div
                      key={v.id}
                      className="bg-card border border-border rounded-xl p-3 flex gap-3 items-start"
                    >
                      {/* Image ou pastille couleur */}
                      {v.image_url ? (
                        <img
                          src={v.image_url}
                          alt={v.valeur_principale || v.nom}
                          className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-border"
                        />
                      ) : v.code_couleur ? (
                        <div
                          className="w-14 h-14 rounded-lg flex-shrink-0 border-2 border-border shadow-sm"
                          style={{ backgroundColor: v.code_couleur }}
                          title={v.code_couleur}
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg flex-shrink-0 bg-muted flex items-center justify-center">
                          <Icon size={20} className="text-muted-foreground" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm text-foreground">
                            {v.valeur_principale || v.nom}
                          </p>
                          {v.prix_supplement && v.prix_supplement > 0 ? (
                            <span className="text-xs font-bold text-primary">
                              +{v.prix_supplement.toLocaleString()} {devise}
                            </span>
                          ) : null}
                        </div>
                        {v.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {v.description}
                          </p>
                        )}
                        {typeof v.stock_disponible === "number" && v.stock_disponible >= 0 && (
                          <p className={`text-xs mt-1 font-medium ${v.stock_disponible > 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {v.stock_disponible > 0
                              ? `${v.stock_disponible} en stock`
                              : "Rupture de stock"}
                          </p>
                        )}
                        {/* Affichage des valeurs additionnelles si fournies */}
                        {Array.isArray(v.valeurs) && v.valeurs.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {v.valeurs.map((val: string, i: number) => (
                              <span
                                key={i}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                              >
                                {val}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
