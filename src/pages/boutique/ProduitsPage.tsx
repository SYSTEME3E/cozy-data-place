/**
 * ProduitsPage — Liste des produits physiques de la boutique
 * Le formulaire d'ajout/modification a été déplacé dans NouveauProduitPage
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BoutiqueLayout from "@/components/BoutiqueLayout";
import { getNexoraUser } from "@/lib/nexora-auth";
import { useNavigate } from "react-router-dom";
import {
  Plus, Trash2, ChevronDown, ChevronUp, Package,
  Star, Edit2, ToggleLeft, ToggleRight, Crown, Share2, Search, MoreVertical, TrendingUp
} from "lucide-react";
import { formatPrix } from "@/lib/devise-utils";

interface Variation { nom: string; valeurs: string[]; }
interface PaiementProduit { reseau: string; numero: string; nom_titulaire: string; }

interface ProduitPhysique {
  id: string; boutique_id: string; nom: string; description: string;
  prix: number; prix_promo: number | null; type: "physique"; categorie: string;
  tags: string[]; stock: number; stock_illimite: boolean; photos: string[];
  actif: boolean; vedette: boolean; paiement_reception: boolean;
  paiement_lien: string | null; moyens_paiement: PaiementProduit[];
  politique_remboursement: string; politique_confidentialite: string;
  poids: string; dimensions: string; sku: string;
  variations?: Variation[];
}

function calcPct(prix: number, promo: number): number {
  return Math.round(((prix - promo) / prix) * 100);
}

export default function ProduitsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [boutique, setBoutique] = useState<any>(null);
  const [produitsPhysiques, setProduitsPhysiques] = useState<ProduitPhysique[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");

  const load = async () => {
    setLoading(true);
    const userId = getNexoraUser()?.id;
    if (!userId) { setLoading(false); return; }
    const { data: b } = await supabase
      .from("boutiques" as any).select("*").eq("user_id", userId).limit(1).maybeSingle();
    if (b) {
      setBoutique(b);
      const { data: phys } = await supabase
        .from("produits" as any).select("*, variations_produit(*)")
        .eq("boutique_id", (b as any).id).eq("type", "physique")
        .order("created_at", { ascending: false });
      setProduitsPhysiques((phys as any[] || []).map((p) => ({
        ...p,
        variations: p.variations_produit || [],
        moyens_paiement: p.moyens_paiement || [],
        tags: p.tags || [],
        reseaux_sociaux: p.reseaux_sociaux || {},
      })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);


  const copyLink = (produitId: string) => {
    if (!boutique?.slug) {
      toast({ title: "Configurez d'abord votre boutique", variant: "destructive" }); return;
    }
    const link = `${window.location.origin}/shop/${boutique.slug}/produit/${produitId}`;
    navigator.clipboard.writeText(link);
    toast({ title: "🔗 Lien copié !", description: link });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce produit définitivement ?")) return;
    await supabase.from("variations_produit" as any).delete().eq("produit_id", id);
    await supabase.from("commandes" as any).update({ produit_id: null }).eq("produit_id", id);
    await supabase.from("avis_produits" as any).delete().eq("produit_id", id);
    const { error } = await supabase.from("produits" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur lors de la suppression", description: error.message, variant: "destructive" }); return;
    }
    setProduitsPhysiques((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "🗑️ Produit supprimé" });
  };

  const toggleField = async (id: string, field: "actif" | "vedette", value: boolean) => {
    await supabase.from("produits" as any).update({ [field]: value }).eq("id", id);
    load();
  };

  const filteredProduits = produitsPhysiques.filter((p) =>
    p.nom.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <BoutiqueLayout boutiqueName={boutique?.nom} boutiqueSlug={boutique?.slug}>
      <div className="space-y-5 pb-10">

        {/* ── Header ── */}
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-gray-100">Produits physiques</h1>
        </div>

        {/* ── Boutons d'action ── */}
        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate("/boutique/prix-interet")}
            variant="outline"
            className="flex-1 gap-1.5 rounded-xl border-green-200 text-[#008000] hover:bg-green-50 dark:border-[#008000] dark:text-[#008000] dark:hover:bg-green-950/30 h-11 font-bold"
          >
            <TrendingUp className="w-4 h-4" /> Prix & Intérêts
          </Button>
          <Button
            onClick={() => navigate("/boutique/produits/nouveau")}
            className="flex-1 bg-[#FF1A00] hover:bg-[#FF1A00] text-white gap-1.5 rounded-xl shadow-sm shadow-pink-200 h-11 font-bold"
          >
            <Plus className="w-4 h-4" /> Nouveau
          </Button>
        </div>

        {/* ── Recherche ── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Rechercher un produit..."
            className="pl-9 h-10 rounded-xl"
          />
        </div>

        {/* ── Liste produits ── */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-[#FF1A00] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredProduits.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-semibold">
              {searchQ ? "Aucun produit trouvé" : "Aucun produit physique"}
            </p>
            {!searchQ && (
              <button
                onClick={() => navigate("/boutique/produits/nouveau")}
                className="mt-4 inline-flex items-center gap-2 text-sm text-[#FF1A00] font-semibold hover:text-[#FF1A00]"
              >
                <Plus className="w-4 h-4" /> Ajouter votre premier produit
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProduits.map((produit) => {
              const isExpanded = expandedId === produit.id;
              const photo = produit.photos?.[0];
              const pctProduit = produit.prix_promo ? calcPct(produit.prix, produit.prix_promo) : 0;

              return (
                <div
                  key={produit.id}
                  className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="p-4">
                    <div className="flex gap-3 items-start">
                      {/* Photo */}
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                        {photo ? (
                          <img src={photo} alt={produit.nom} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-300" />
                          </div>
                        )}
                        {pctProduit > 0 && (
                          <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black px-1 py-0.5 rounded-bl-lg">
                            -{pctProduit}%
                          </div>
                        )}
                      </div>

                      {/* Infos */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-800 truncate">{produit.nom}</span>
                          {produit.vedette && (
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            produit.actif
                              ? "bg-green-100 text-[#008000]"
                              : "bg-gray-100 text-gray-400"
                          }`}>
                            {produit.actif ? "Actif" : "Inactif"}
                          </span>
                        </div>

                        {produit.categorie && (
                          <p className="text-xs text-gray-400 mt-0.5">{produit.categorie}</p>
                        )}

                        <div className="flex items-center gap-2 mt-1">
                          {produit.prix_promo ? (
                            <>
                              <span className="font-black text-[#FF1A00] text-sm">
                                {formatPrix(produit.prix_promo, boutique?.devise)}
                              </span>
                              <span className="text-xs text-red-400 line-through font-bold">
                                {formatPrix(produit.prix, boutique?.devise)}
                              </span>
                            </>
                          ) : (
                            <span className="font-black text-[#FF1A00] text-sm">
                              {formatPrix(produit.prix, boutique?.devise)}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-400 mt-0.5">
                          {produit.stock_illimite ? "Stock illimité" : `Stock : ${produit.stock}`}
                          {produit.sku && ` • ${produit.sku}`}
                        </p>
                      </div>

                      {/* Actions — menu 3 points */}
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === produit.id ? null : produit.id)}
                          className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        {openMenuId === produit.id && (
                          <>
                            <div className="fixed inset-0 z-[40]" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-0 top-10 z-[50] w-44 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden py-1">
                              <button onClick={() => { copyLink(produit.id); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-[#305CDE] hover:bg-blue-50 transition-colors">
                                <Share2 className="w-4 h-4" /> Copier le lien
                              </button>
                              <button onClick={() => { navigate(`/boutique/produits/modifier/${produit.id}`); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-[#FF1A00] hover:bg-[#FF1A00] transition-colors">
                                <Edit2 className="w-4 h-4" /> Modifier
                              </button>
                              <button onClick={() => { setExpandedId(isExpanded ? null : produit.id); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                {isExpanded ? "Réduire" : "Voir détails"}
                              </button>
                              <div className="h-px bg-gray-100 dark:bg-gray-700 mx-3 my-1" />
                              <button onClick={() => { handleDelete(produit.id); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                                <Trash2 className="w-4 h-4" /> Supprimer
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section expandée */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/60 p-4 space-y-3 rounded-b-2xl">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => toggleField(produit.id, "actif", !produit.actif)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                            produit.actif
                              ? "bg-green-100 text-[#008000] hover:bg-green-200"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {produit.actif ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          {produit.actif ? "Désactiver" : "Activer"}
                        </button>
                        <button
                          onClick={() => toggleField(produit.id, "vedette", !produit.vedette)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                            produit.vedette
                              ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          <Star className="w-3.5 h-3.5" />
                          {produit.vedette ? "Retirer vedette" : "Mettre en vedette"}
                        </button>
                      </div>

                      {produit.description && (
                        <p className="text-sm text-gray-500 line-clamp-3">{produit.description}</p>
                      )}

                      {produit.tags && produit.tags.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                          {produit.tags.map((tag, i) => (
                            <span key={i} className="text-xs bg-[#FF1A00]/5 text-[#FF1A00] px-2.5 py-1 rounded-full border border-[#FF1A00]">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {produit.photos && produit.photos.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {produit.photos.map((url, i) => (
                            <img key={i} src={url} alt="" className="w-14 h-14 object-cover rounded-xl border border-gray-100 flex-shrink-0" />
                          ))}
                        </div>
                      )}

                      {produit.variations && produit.variations.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-gray-500 mb-1.5">Variations</p>
                          {produit.variations.map((v, i) => (
                            <p key={i} className="text-xs text-gray-500">
                              <span className="font-semibold text-gray-600">{v.nom} : </span>
                              {v.valeurs.join(", ")}
                            </p>
                          ))}
                        </div>
                      )}

                      
                      <div>
                        <p className="text-xs font-bold text-gray-500 mb-1.5">Paiements acceptés</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {produit.paiement_reception && (
                            <span className="text-xs bg-green-100 text-[#008000] px-2.5 py-1 rounded-lg font-medium">
                              À la réception
                            </span>
                          )}
                          {produit.paiement_lien && (
                            <span className="text-xs bg-blue-100 text-[#305CDE] px-2.5 py-1 rounded-lg font-medium">
                              Lien de paiement
                            </span>
                          )}
                          {(produit.moyens_paiement || []).map((mp, i) => (
                            <span key={i} className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-lg font-medium">
                              {mp.reseau}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </BoutiqueLayout>
  );
}
