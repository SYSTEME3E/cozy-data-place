/**
 * BIEN-ÊTRE YUPI — Page Commandes (Admin uniquement)
 * Affiche toutes les commandes avec infos acheteurs pour les contacter
 */

import { useState, useEffect } from "react";
import { Phone, MapPin, Package, Calendar, CheckCircle, Clock, Truck, XCircle, MessageCircle, RefreshCw, ChevronDown, Search, ShoppingBag, User, FileText } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { isNexoraAdmin } from "@/lib/nexora-auth";
import { useNavigate } from "react-router-dom";

const VENDEUR_WHATSAPP = "2290151762341";

const STATUTS = [
  { value: "en_attente",    label: "En attente",     icon: <Clock className="w-3.5 h-3.5" />,        color: "text-yellow-500",  bg: "bg-yellow-500/10",  border: "border-yellow-500/20"  },
  { value: "confirmee",     label: "Confirmée",      icon: <CheckCircle className="w-3.5 h-3.5" />,  color: "text-blue-500",    bg: "bg-blue-500/10",    border: "border-blue-500/20"    },
  { value: "en_livraison",  label: "En livraison",   icon: <Truck className="w-3.5 h-3.5" />,        color: "text-orange-500",  bg: "bg-orange-500/10",  border: "border-orange-500/20"  },
  { value: "livree",        label: "Livrée",         icon: <CheckCircle className="w-3.5 h-3.5" />,  color: "text-green-500",   bg: "bg-green-500/10",   border: "border-green-500/20"   },
  { value: "annulee",       label: "Annulée",        icon: <XCircle className="w-3.5 h-3.5" />,      color: "text-red-500",     bg: "bg-red-500/10",     border: "border-red-500/20"     },
];

function StatutBadge({ statut }: { statut: string }) {
  const s = STATUTS.find(x => x.value === statut) || STATUTS[0];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${s.bg} ${s.color} border ${s.border}`}>
      {s.icon} {s.label}
    </span>
  );
}

export default function YupiCommandesPage() {
  const navigate = useNavigate();
  const [commandes, setCommandes] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filterStatut, setFilterStatut] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Vérification admin
  useEffect(() => {
    if (!isNexoraAdmin()) { navigate("/dashboard"); }
  }, []);

  const loadCommandes = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("yupi_commandes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error("Erreur chargement commandes YUPI:", error);
    setCommandes(data || []);
    setLoading(false);
  };

  useEffect(() => { loadCommandes(); }, []);

  const updateStatut = async (id: string, statut: string) => {
    setUpdatingId(id);
    await (supabase as any).from("yupi_commandes").update({ statut }).eq("id", id);
    setCommandes(prev => prev.map(c => c.id === id ? { ...c, statut } : c));
    if (selectedOrder?.id === id) setSelectedOrder((prev: any) => ({ ...prev, statut }));
    setUpdatingId(null);
  };

  const filtered = commandes.filter(c => {
    const matchSearch = !search || c.client_nom?.toLowerCase().includes(search.toLowerCase()) ||
      c.reference?.toLowerCase().includes(search.toLowerCase()) ||
      c.client_whatsapp?.includes(search) ||
      c.ville?.toLowerCase().includes(search.toLowerCase());
    const matchStatut = filterStatut === "all" || c.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  // Stats
  const stats = {
    total:       commandes.length,
    attente:     commandes.filter(c => c.statut === "en_attente").length,
    confirmees:  commandes.filter(c => c.statut === "confirmee").length,
    livrees:     commandes.filter(c => c.statut === "livree").length,
    chiffre:     commandes.reduce((a, c) => a + (c.total || 0), 0),
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-border border-t-violet-500 rounded-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto pb-12">

        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl mb-6"
          style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e1b4b 40%,#065f46 100%)" }}>
          <div className="relative z-10 p-6 text-white">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingBag className="w-5 h-5 text-green-300" />
                  <span className="text-green-300 text-sm font-bold uppercase tracking-widest">Admin · BIEN-ÊTRE YUPI</span>
                </div>
                <h1 className="text-3xl font-black">Gestion des Commandes</h1>
                <p className="text-indigo-200 text-sm mt-1">Toutes les commandes de la boutique · Contacter les acheteurs</p>
              </div>
              <button onClick={loadCommandes} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold px-4 py-2.5 rounded-2xl transition-colors">
                <RefreshCw className="w-4 h-4" /> Actualiser
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Total", value: stats.total,      color: "text-foreground",  bg: "bg-card" },
            { label: "En attente", value: stats.attente, color: "text-yellow-500", bg: "bg-yellow-500/10" },
            { label: "Confirmées", value: stats.confirmees, color: "text-blue-500", bg: "bg-blue-500/10" },
            { label: "Livrées",  value: stats.livrees,  color: "text-green-500",  bg: "bg-green-500/10" },
            { label: "Chiffre d'affaires", value: `${stats.chiffre.toLocaleString()} F`, color: "text-violet-500", bg: "bg-violet-500/10" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border border-border rounded-2xl p-3 text-center`}>
              <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input placeholder="Rechercher (nom, réf, tel, ville)…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
          </div>
          <div className="relative">
            <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40">
              <option value="all">Tous les statuts</option>
              {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Liste commandes */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-14 h-14 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-semibold">Aucune commande trouvée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(commande => (
              <div key={commande.id}
                className={`bg-card border rounded-2xl transition-all ${selectedOrder?.id === commande.id ? "border-violet-500/50 shadow-md" : "border-border hover:border-violet-500/20"}`}>
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setSelectedOrder(selectedOrder?.id === commande.id ? null : commande)}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-violet-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-sm text-foreground">{commande.reference}</p>
                          <StatutBadge statut={commande.statut} />
                        </div>
                        <p className="text-sm text-foreground font-semibold">{commande.client_nom}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {commande.client_whatsapp}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {commande.ville}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(commande.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-black text-green-500">{(commande.total || 0).toLocaleString()} FCFA</p>
                      <p className="text-xs text-muted-foreground">{Array.isArray(commande.items) ? commande.items.length : 0} produit{Array.isArray(commande.items) && commande.items.length > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </div>

                {/* Détail expandé */}
                {selectedOrder?.id === commande.id && (
                  <div className="border-t border-border p-4 space-y-4">

                    {/* Infos client */}
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Informations Client</p>
                        <div className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-violet-400" /><span className="font-semibold">{commande.client_nom}</span></div>
                        <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-green-400" /><span>{commande.client_whatsapp}</span></div>
                        <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-red-400" /><span>{commande.ville}</span></div>
                        {commande.adresse_livraison && <div className="flex items-start gap-2 text-sm"><Package className="w-4 h-4 text-orange-400 mt-0.5" /><span>{commande.adresse_livraison}</span></div>}
                        {commande.notes && <div className="flex items-start gap-2 text-sm"><FileText className="w-4 h-4 text-blue-400 mt-0.5" /><span className="italic text-muted-foreground">{commande.notes}</span></div>}
                      </div>

                      {/* Produits commandés */}
                      <div className="bg-muted/50 rounded-xl p-4">
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Produits Commandés</p>
                        <div className="space-y-2">
                          {Array.isArray(commande.items) && commande.items.map((item: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="font-semibold text-foreground truncate mr-2">{item.nom} <span className="text-muted-foreground font-normal">×{item.qty}</span></span>
                              <span className="text-green-500 font-bold flex-shrink-0">{((item.prix || 0) * (item.qty || 1)).toLocaleString()} F</span>
                            </div>
                          ))}
                          <div className="border-t border-border pt-2 flex justify-between font-black">
                            <span className="text-xs text-muted-foreground">TOTAL</span>
                            <span className="text-green-500">{(commande.total || 0).toLocaleString()} FCFA</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Contacter le client sur WhatsApp */}
                      <a
                        href={`https://wa.me/${commande.client_whatsapp?.replace(/[\s+]/g, "")}?text=${encodeURIComponent(`Bonjour ${commande.client_nom} 👋, je suis BIEN-ÊTRE YUPI. Votre commande *${commande.reference}* est bien reçue. Nous allons vous contacter pour organiser la livraison. Merci ! 🌿`)}`}
                        target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" /> Contacter le client
                      </a>

                      {/* Changer le statut */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-semibold">Statut :</span>
                        <div className="relative">
                          <select
                            value={commande.statut}
                            onChange={e => updateStatut(commande.id, e.target.value)}
                            disabled={updatingId === commande.id}
                            className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:opacity-50"
                          >
                            {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                          {updatingId === commande.id
                            ? <RefreshCw className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-violet-500 animate-spin pointer-events-none" />
                            : <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                          }
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
