import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import BoutiqueLayout from "@/components/BoutiqueLayout";
import { getNexoraUser } from "@/lib/nexora-auth";
import { useNavigate } from "react-router-dom";
import {
  ShoppingBag, ChevronDown, ChevronUp, Phone,
  Clock, CheckCircle, Truck,
  XCircle, Search, MessageCircle, Crown, Zap, Package
} from "lucide-react";

// 4 statuts seulement
type StatutCommande = "en_cours" | "payee" | "livree" | "annulee";

interface ArticleCommande {
  produit_id?: string | null;
  nom_produit: string;
  prix_unitaire: number;
  quantite: number;
  montant: number;
  photo_url: string | null;
  variations_choisies: Record<string, string>;
  type?: string;
}

interface Commande {
  id: string;
  numero: string;
  client_nom: string;
  client_tel: string | null;
  client_email: string | null;
  client_adresse: string | null;
  total: number;
  devise: string;
  statut: StatutCommande;
  items: ArticleCommande[];
  created_at: string;
  articles?: ArticleCommande[];
}

const STATUTS: Record<StatutCommande, { label: string; color: string; bg: string; darkColor: string; darkBg: string; icon: any; terminal: boolean }> = {
  en_cours: { label: "En cours",  color: "text-[#305CDE]",  bg: "bg-blue-100",  darkColor: "dark:text-[#305CDE]",  darkBg: "dark:bg-blue-950/50",  icon: Clock,        terminal: false },
  payee:    { label: "Payé",      color: "text-[#008000]", bg: "bg-green-100", darkColor: "dark:text-[#008000]", darkBg: "dark:bg-green-950/50", icon: CheckCircle,  terminal: true  },
  livree:   { label: "Livré",     color: "text-[#305CDE]",bg: "bg-blue-100",darkColor: "dark:text-[#305CDE]",darkBg: "dark:bg-[#305CDE]/20",icon: Truck,        terminal: true  },
  annulee:  { label: "Annulé",    color: "text-red-700",   bg: "bg-red-100",   darkColor: "dark:text-red-300",   darkBg: "dark:bg-red-950/50",   icon: XCircle,      terminal: true  },
};

const ORDRE_STATUTS: StatutCommande[] = ["en_cours", "payee", "livree", "annulee"];

import { formatPrix as formatMontant } from "@/lib/devise-utils";

function formatDate(dt: string): string {
  return new Date(dt).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

export default function CommandesPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [boutique, setBoutique] = useState<any>(null);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [filterStatut, setFilterStatut] = useState<StatutCommande | "">("");

  const load = async () => {
    setLoading(true);
    const userId = getNexoraUser()?.id;
    if (!userId) { setLoading(false); return; }
    const { data: b } = await supabase
      .from("boutiques" as any).select("*").eq("user_id", userId).limit(1).maybeSingle();
    if (b) setBoutique(b);
    if (b) {
      const { data } = await supabase
        .from("commandes" as any).select("*")
        .eq("boutique_id", (b as any).id)
        .neq("product_type", "numerique")
        .order("created_at", { ascending: false });
      setCommandes((data as any[] || []).map(c => ({
        ...c,
        // Migration : si l'ancienne base a d'autres statuts, on les mappe vers en_cours
        statut: (["en_cours", "payee", "livree", "annulee"].includes(c.statut) ? c.statut : "en_cours") as StatutCommande,
        articles: Array.isArray(c.items) ? c.items : [],
        items: Array.isArray(c.items) ? c.items : [],
      })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);


  const changeStatut = async (id: string, statut: StatutCommande) => {
    await supabase.from("commandes" as any).update({ statut }).eq("id", id);
    toast({ title: `Statut mis à jour : ${STATUTS[statut].label}` });
    load();
  };

  const filtered = commandes.filter(c => {
    const matchSearch = c.client_nom.toLowerCase().includes(searchQ.toLowerCase()) ||
      c.numero.toLowerCase().includes(searchQ.toLowerCase());
    const matchStatut = filterStatut ? c.statut === filterStatut : true;
    return matchSearch && matchStatut;
  });

  const total = commandes.length;
  const labelCommande = total <= 1 ? "commande" : "commandes";

  const stats = {
    enCours: commandes.filter(c => c.statut === "en_cours").length,
    payees: commandes.filter(c => c.statut === "payee").length,
    livrees: commandes.filter(c => c.statut === "livree").length,
    chiffre: commandes.filter(c => c.statut !== "annulee").reduce((s, c) => s + c.total, 0),
  };

  return (
    <BoutiqueLayout boutiqueName={boutique?.nom} boutiqueSlug={boutique?.slug}>
      <div className="space-y-5 pb-10">

        {/* Header avec badge nombre */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-gray-800 dark:text-gray-100">
                {total <= 1 ? "Commande" : "Commandes"}
              </h1>
              
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{total} {labelCommande} au total</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-[#305CDE] font-semibold mb-1">En cours</p>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.enCours}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-[#305CDE] font-semibold mb-1">Payées</p>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.payees}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-[#305CDE] font-semibold mb-1">Livrées</p>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.livrees}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-[#305CDE] font-semibold mb-1">Chiffre d'affaires</p>
            <p className="text-lg font-black text-gray-900 dark:text-white">
              {formatMontant(stats.chiffre, boutique?.devise || "XOF")}
            </p>
          </div>
        </div>

        {/* Filtres */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder="Rechercher client, numéro..."
              className="pl-9 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500" />
          </div>
          <select value={filterStatut} onChange={e => setFilterStatut(e.target.value as any)}
            className="w-full h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
            <option value="">Tous les statuts</option>
            {ORDRE_STATUTS.map(s => (
              <option key={s} value={s}>{STATUTS[s].label}</option>
            ))}
          </select>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-[#FF1A00] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl">
            <ShoppingBag className="w-12 h-12 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Aucune commande</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Les commandes apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(cmd => {
              const isExpanded = expandedId === cmd.id;
              const StatutIcon = STATUTS[cmd.statut].icon;
              const estTerminal = STATUTS[cmd.statut].terminal;

              return (
                <div key={cmd.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[#1D4ED8] dark:text-[#1D4ED8] text-sm">#{cmd.numero}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1
                            ${STATUTS[cmd.statut].bg} ${STATUTS[cmd.statut].color}
                            ${STATUTS[cmd.statut].darkBg} ${STATUTS[cmd.statut].darkColor}`}>
                            <StatutIcon className="w-3 h-3" />
                            {STATUTS[cmd.statut].label}
                          </span>
                          {/* Badge succès si confirmé */}
                          {cmd.statut !== "en_cours" && cmd.statut !== "annulee" && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-green-100 text-[#008000] dark:bg-green-950/40 dark:text-[#008000]">
                              ✅ Succès
                            </span>
                          )}
                        </div>

                        <p className="font-semibold text-gray-800 dark:text-gray-100 mt-1">{cmd.client_nom}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
                          {cmd.client_tel && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{cmd.client_tel}</span>}
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(cmd.created_at)}</span>
                        </div>

                        <div className="text-lg font-black text-gray-800 dark:text-gray-100 mt-1">
                          {formatMontant(cmd.total, cmd.devise)}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {cmd.articles?.length || 0} article{(cmd.articles?.length || 0) > 1 ? "s" : ""}
                        </p>
                      </div>

                      <button onClick={() => setExpandedId(isExpanded ? null : cmd.id)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          : <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4 space-y-4">

                      {/* Articles */}
                      {cmd.articles && cmd.articles.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Articles commandés</p>
                          <div className="space-y-2">
                            {cmd.articles.map((art, i) => {
                              const nomArt = (art as any).nom_produit || (art as any).nom || "Produit";
                              const prixUnit = (art as any).prix_unitaire || (art as any).prix || 0;
                              const montantArt = (art as any).montant || 0;
                              const qteArt = (art as any).quantite || 1;
                              const photoArt = (art as any).photo_url || null;
                              const typeArt = (art as any).type;
                              return (
                                <div key={i} className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                                  <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                    {photoArt
                                      ? <img src={photoArt} alt="" className="w-full h-full object-cover" />
                                      : typeArt === "numerique"
                                        ? <Zap className="w-5 h-5 text-[#305CDE]" />
                                        : <Package className="w-5 h-5 text-gray-400" />
                                    }
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">{nomArt}</p>
                                    {typeArt === "numerique" && (
                                      <span className="text-xs bg-blue-100 dark:bg-[#305CDE]/40 text-[#305CDE] dark:text-[#305CDE] px-2 py-0.5 rounded-full font-medium">Digital</span>
                                    )}
                                    {(art as any).variations_choisies && Object.keys((art as any).variations_choisies).length > 0 && (
                                      <p className="text-xs text-gray-400 dark:text-gray-500">
                                        {Object.entries((art as any).variations_choisies).map(([k, v]) => `${k}: ${v}`).join(" • ")}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                      {qteArt} × {formatMontant(prixUnit, cmd.devise)}
                                    </p>
                                  </div>
                                  <span className="font-bold text-gray-800 dark:text-gray-200 text-sm flex-shrink-0">
                                    {formatMontant(montantArt, cmd.devise)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-3 flex justify-between font-black text-gray-800 dark:text-gray-100 border-t border-gray-200 dark:border-gray-700 pt-2 text-sm">
                            <span>Total</span>
                            <span>{formatMontant(cmd.total, cmd.devise)}</span>
                          </div>
                        </div>
                      )}

                      {/* Infos client */}
                      {(cmd.client_adresse || cmd.client_email) && (
                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Informations client</p>
                          {cmd.client_adresse && <p className="text-sm text-gray-700 dark:text-gray-200">{cmd.client_adresse}</p>}
                          {cmd.client_email && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{cmd.client_email}</p>}
                        </div>
                      )}

                      {/* Action commande */}
                      {cmd.statut === "en_cours" ? (
                        <button
                          onClick={async () => {
                            await changeStatut(cmd.id, "payee");
                            setExpandedId(null);
                          }}
                          className="w-full flex items-center justify-center gap-2 bg-[#008000] hover:bg-[#008000] active:scale-95 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-green-200 dark:shadow-green-900/30 transition-all"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Confirmer la commande
                        </button>
                      ) : (
                        <div className="flex items-center justify-center gap-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-[#008000] rounded-xl py-3 px-4">
                          <CheckCircle className="w-5 h-5 text-[#008000] flex-shrink-0" />
                          <p className="text-sm font-bold text-[#008000] dark:text-[#008000]">
                            ✅ Commande confirmée — {STATUTS[cmd.statut].label}
                          </p>
                        </div>
                      )}

                      {/* Contact client */}
                      {cmd.client_tel && (
                        <div className="flex gap-2">
                          <a href={`tel:${cmd.client_tel}`}
                            className="flex-1 flex items-center justify-center gap-2 bg-[#008000] text-white rounded-xl py-2.5 text-sm font-semibold">
                            <Phone className="w-4 h-4" /> Appeler
                          </a>
                          <a href={`https://wa.me/${cmd.client_tel.replace(/[^0-9]/g, "")}?text=Bonjour ${cmd.client_nom}, concernant votre commande #${cmd.numero}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-xl py-2.5 text-sm font-semibold">
                            <MessageCircle className="w-4 h-4" /> WhatsApp
                          </a>
                        </div>
                      )}
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
