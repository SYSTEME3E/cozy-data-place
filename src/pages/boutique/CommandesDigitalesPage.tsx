import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import BoutiqueLayout from "@/components/BoutiqueLayout";
import { getNexoraUser, hasNexoraPremium } from "@/lib/nexora-auth";
import { useNavigate } from "react-router-dom";
import {
  Zap, ChevronDown, ChevronUp, Phone,
  Clock, CheckCircle,
  XCircle, Search, MessageCircle, Crown, Package
} from "lucide-react";

type StatutCommande = "en_attente" | "nouvelle" | "confirmee" | "en_preparation" | "expediee" | "livree" | "annulee";
type StatutPaiement = "en_attente" | "paye" | "echoue" | "rembourse";

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
  statut_paiement: StatutPaiement;
  statut: StatutCommande;
  items: ArticleCommande[];
  created_at: string;
  articles?: ArticleCommande[];
}

const STATUTS: Record<StatutCommande, { label: string; color: string; bg: string; darkColor: string; darkBg: string; icon: any }> = {
  en_attente:     { label: "En attente",      color: "text-slate-700",  bg: "bg-slate-100",  darkColor: "dark:text-slate-300",  darkBg: "dark:bg-slate-800",  icon: Clock },
  nouvelle:       { label: "Nouvelle",        color: "text-blue-700",   bg: "bg-blue-100",   darkColor: "dark:text-blue-300",   darkBg: "dark:bg-blue-950/50",   icon: Zap },
  confirmee:      { label: "Confirmée",       color: "text-purple-700", bg: "bg-purple-100", darkColor: "dark:text-purple-300", darkBg: "dark:bg-purple-950/50", icon: CheckCircle },
  en_preparation: { label: "En préparation",  color: "text-yellow-700", bg: "bg-yellow-100", darkColor: "dark:text-yellow-300", darkBg: "dark:bg-yellow-950/50", icon: Package },
  expediee:       { label: "Envoyée",         color: "text-orange-700", bg: "bg-orange-100", darkColor: "dark:text-orange-300", darkBg: "dark:bg-orange-950/50", icon: Zap },
  livree:         { label: "Livrée",          color: "text-green-700",  bg: "bg-green-100",  darkColor: "dark:text-green-300",  darkBg: "dark:bg-green-950/50",  icon: CheckCircle },
  annulee:        { label: "Annulée",         color: "text-red-700",    bg: "bg-red-100",    darkColor: "dark:text-red-300",    darkBg: "dark:bg-red-950/50",    icon: XCircle },
};

const STATUTS_PAIEMENT: Record<StatutPaiement, { label: string; color: string; bg: string; darkColor: string; darkBg: string }> = {
  en_attente: { label: "En attente", color: "text-yellow-700", bg: "bg-yellow-100", darkColor: "dark:text-yellow-300", darkBg: "dark:bg-yellow-950/50" },
  paye:       { label: "Payé",       color: "text-green-700",  bg: "bg-green-100",  darkColor: "dark:text-green-300",  darkBg: "dark:bg-green-950/50"  },
  echoue:     { label: "Échoué",     color: "text-red-700",    bg: "bg-red-100",    darkColor: "dark:text-red-300",    darkBg: "dark:bg-red-950/50"    },
  rembourse:  { label: "Remboursé",  color: "text-gray-700",   bg: "bg-gray-100",   darkColor: "dark:text-gray-300",   darkBg: "dark:bg-gray-800"      },
};

const ORDRE_STATUTS: StatutCommande[] = [
  "en_attente", "nouvelle", "confirmee", "en_preparation", "expediee", "livree", "annulee"
];

import { formatPrix as formatMontant } from "@/lib/devise-utils";

function formatDate(dt: string): string {
  return new Date(dt).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

/** Vérifie si une commande contient au moins un article numérique */
function hasDigitalItem(articles: ArticleCommande[]): boolean {
  return articles.some(a => (a as any).type === "numerique");
}

export default function CommandesDigitalesPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const isPremium = hasNexoraPremium();

  const [boutique, setBoutique] = useState<any>(null);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [filterStatut, setFilterStatut] = useState<StatutCommande | "">("");
  const [filterPaiement, setFilterPaiement] = useState<StatutPaiement | "">("");

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
        .order("created_at", { ascending: false });

      const allCommandes: Commande[] = (data as any[] || []).map(c => ({
        ...c,
        articles: Array.isArray(c.items) ? c.items : [],
        items: Array.isArray(c.items) ? c.items : [],
      }));

      // Filtrer uniquement les commandes contenant des articles numériques
      setCommandes(allCommandes.filter(c => hasDigitalItem(c.articles || [])));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (!isPremium) {
    return (
      <BoutiqueLayout boutiqueName="Nexora Shop">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center mb-6 shadow-lg">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 mb-2">Fonctionnalité Premium</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-1 max-w-xs">
            La boutique est réservée aux membres <span className="font-bold text-yellow-600">Premium</span>.
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mb-8 max-w-xs">
            Passez au plan Premium pour gérer vos commandes digitales et votre boutique.
          </p>
          <button
            onClick={() => navigate("/boutique/parametres")}
            className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white font-bold px-8 py-3 rounded-xl shadow-md transition-all"
          >
            <Crown className="w-4 h-4" /> Passer à Premium
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>
      </BoutiqueLayout>
    );
  }

  const changeStatut = async (id: string, statut: StatutCommande) => {
    await supabase.from("commandes" as any).update({ statut }).eq("id", id);
    toast({ title: `Statut mis à jour : ${STATUTS[statut].label}` });
    load();
  };

  const changePaiement = async (id: string, statut_paiement: StatutPaiement) => {
    await supabase.from("commandes" as any).update({ statut_paiement }).eq("id", id);
    toast({ title: `Paiement mis à jour : ${STATUTS_PAIEMENT[statut_paiement].label}` });
    load();
  };

  const filtered = commandes.filter(c => {
    const matchSearch = c.client_nom.toLowerCase().includes(searchQ.toLowerCase()) ||
      c.numero.toLowerCase().includes(searchQ.toLowerCase());
    const matchStatut = filterStatut ? c.statut === filterStatut : true;
    const matchPaiement = filterPaiement ? c.statut_paiement === filterPaiement : true;
    return matchSearch && matchStatut && matchPaiement;
  });

  const stats = {
    total: commandes.length,
    nouvelles: commandes.filter(c => c.statut === "nouvelle").length,
    chiffre: commandes.filter(c => c.statut !== "annulee").reduce((s, c) => s + c.total, 0),
    livrees: commandes.filter(c => c.statut === "livree").length,
  };

  return (
    <BoutiqueLayout boutiqueName={boutique?.nom} boutiqueSlug={boutique?.slug}>
      <div className="space-y-5 pb-10">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
              <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <h1 className="text-2xl font-black text-gray-800 dark:text-gray-100">Commandes Digitales</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{commandes.length} commande{commandes.length > 1 ? "s" : ""} de produits digitaux</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900 rounded-2xl p-4">
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Nouvelles</p>
            <p className="text-3xl font-black text-purple-700 dark:text-purple-300">{stats.nouvelles}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900 rounded-2xl p-4">
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">Livrées</p>
            <p className="text-3xl font-black text-green-700 dark:text-green-300">{stats.livrees}</p>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-2xl p-4 col-span-2">
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Chiffre d'affaires digital</p>
            <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300">
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
          <div className="flex gap-2">
            <select value={filterStatut} onChange={e => setFilterStatut(e.target.value as any)}
              className="flex-1 h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
              <option value="">Tous statuts</option>
              {ORDRE_STATUTS.map(s => (
                <option key={s} value={s}>{STATUTS[s].label}</option>
              ))}
            </select>
            <select value={filterPaiement} onChange={e => setFilterPaiement(e.target.value as any)}
              className="flex-1 h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
              <option value="">Tout paiement</option>
              {Object.entries(STATUTS_PAIEMENT).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl">
            <Zap className="w-12 h-12 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Aucune commande digitale</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Les commandes de produits digitaux apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(cmd => {
              const isExpanded = expandedId === cmd.id;
              const StatutIcon = STATUTS[cmd.statut].icon;

              return (
                <div key={cmd.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-purple-600 dark:text-purple-400 text-sm">#{cmd.numero}</span>
                          <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Digital
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1
                            ${STATUTS[cmd.statut].bg} ${STATUTS[cmd.statut].color}
                            ${STATUTS[cmd.statut].darkBg} ${STATUTS[cmd.statut].darkColor}`}>
                            <StatutIcon className="w-3 h-3" />
                            {STATUTS[cmd.statut].label}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                            ${STATUTS_PAIEMENT[cmd.statut_paiement].bg} ${STATUTS_PAIEMENT[cmd.statut_paiement].color}
                            ${STATUTS_PAIEMENT[cmd.statut_paiement].darkBg} ${STATUTS_PAIEMENT[cmd.statut_paiement].darkColor}`}>
                            {STATUTS_PAIEMENT[cmd.statut_paiement].label}
                          </span>
                        </div>

                        <p className="font-semibold text-gray-800 dark:text-gray-100 mt-1">{cmd.client_nom}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
                          {cmd.client_tel && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{cmd.client_tel}</span>}
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(cmd.created_at)}</span>
                        </div>

                        <div className="text-lg font-black text-purple-600 dark:text-purple-400 mt-1">
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
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Produits digitaux commandés</p>
                          <div className="space-y-2">
                            {cmd.articles.map((art, i) => {
                              const nomArt = (art as any).nom_produit || (art as any).nom || "Produit";
                              const prixUnit = (art as any).prix_unitaire || (art as any).prix || 0;
                              const montantArt = (art as any).montant || 0;
                              const qteArt = (art as any).quantite || 1;
                              const photoArt = (art as any).photo_url || null;
                              return (
                                <div key={i} className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                                  <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                    {photoArt
                                      ? <img src={photoArt} alt="" className="w-full h-full object-cover" />
                                      : <Zap className="w-5 h-5 text-purple-400" />
                                    }
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">{nomArt}</p>
                                    <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-medium">Digital</span>
                                    {(art as any).variations_choisies && Object.keys((art as any).variations_choisies).length > 0 && (
                                      <p className="text-xs text-gray-400 dark:text-gray-500">
                                        {Object.entries((art as any).variations_choisies).map(([k, v]) => `${k}: ${v}`).join(" • ")}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                      {qteArt} × {formatMontant(prixUnit, cmd.devise)}
                                    </p>
                                  </div>
                                  <span className="font-bold text-purple-600 dark:text-purple-400 text-sm flex-shrink-0">
                                    {formatMontant(montantArt, cmd.devise)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-3 space-y-1 text-sm">
                            <div className="flex justify-between font-black text-purple-600 dark:text-purple-400 border-t border-gray-200 dark:border-gray-700 pt-1">
                              <span>Total</span>
                              <span>{formatMontant(cmd.total, cmd.devise)}</span>
                            </div>
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

                      {/* Changer statut */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Changer le statut</p>
                        <div className="flex gap-2 flex-wrap">
                          {ORDRE_STATUTS.filter(s => s !== cmd.statut).map(s => (
                            <button key={s} onClick={() => changeStatut(cmd.id, s)}
                              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors
                                ${STATUTS[s].bg} ${STATUTS[s].color}
                                ${STATUTS[s].darkBg} ${STATUTS[s].darkColor}
                                hover:opacity-80`}>
                              → {STATUTS[s].label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Statut paiement */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Statut paiement</p>
                        <div className="flex gap-2 flex-wrap">
                          {(Object.keys(STATUTS_PAIEMENT) as StatutPaiement[])
                            .filter(s => s !== cmd.statut_paiement)
                            .map(s => (
                              <button key={s} onClick={() => changePaiement(cmd.id, s)}
                                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors
                                  ${STATUTS_PAIEMENT[s].bg} ${STATUTS_PAIEMENT[s].color}
                                  ${STATUTS_PAIEMENT[s].darkBg} ${STATUTS_PAIEMENT[s].darkColor}
                                  hover:opacity-80`}>
                                → {STATUTS_PAIEMENT[s].label}
                              </button>
                            ))}
                        </div>
                      </div>

                      {/* Contact client */}
                      {cmd.client_tel && (
                        <div className="flex gap-2">
                          <a href={`tel:${cmd.client_tel}`}
                            className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white rounded-xl py-2.5 text-sm font-semibold">
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
