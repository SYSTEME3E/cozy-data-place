import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import BoutiqueLayout from "@/components/BoutiqueLayout";
import { getNexoraUser } from "@/lib/nexora-auth";
import { formatPrix as formatMontant } from "@/lib/devise-utils";
import {
  Zap, Search, ChevronDown, ChevronUp,
  Clock, CheckCircle, XCircle, AlertCircle,
  Phone, MessageCircle, TrendingUp, Ban,
  BadgeCheck, Hourglass, RefreshCw
} from "lucide-react";

// ──────────────────────────────────────────────────────────────
// Types & constantes
// ──────────────────────────────────────────────────────────────

type StatutVente =
  | "en_attente"   // paiement initié mais pas encore confirmé
  | "en_cours"     // widget KKiaPay ouvert / paiement en traitement
  | "confirmee"    // kkiapay-verify a confirmé → statut final succès
  | "echouee"      // paiement échoué côté KKiaPay
  | "annulee";     // annulée manuellement (avant paiement)

interface Vente {
  id: string;
  numero: string;
  client_nom: string;
  client_tel: string | null;
  client_email: string | null;
  total: number;
  devise: string;
  statut: string;
  statut_paiement: string;
  kkiapay_id: string | null;
  product_type: string | null;
  items: any[];
  created_at: string;
  produit_id: string | null;
}

// Statut dérivé affiché (on combine statut + statut_paiement)
type StatutAffiche = "confirme" | "en_cours" | "en_attente" | "echoue" | "annule";

function getStatutAffiche(v: Vente): StatutAffiche {
  if (v.statut === "confirmee" || v.statut_paiement === "paye") return "confirme";
  if (v.statut === "annulee") return "annule";
  if (v.statut_paiement === "echoue") return "echoue";
  if (v.statut === "en_cours") return "en_cours";
  return "en_attente";
}

const STATUTS_CONFIG: Record<StatutAffiche, {
  label: string;
  icon: any;
  pill: string;
  dot: string;
  bg: string;
  border: string;
}> = {
  confirme: {
    label: "Confirmé",
    icon: BadgeCheck,
    pill: "bg-emerald-100 text-[#008000] dark:bg-[#008000]/40 dark:text-[#008000]",
    dot: "bg-[#008000]",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  en_cours: {
    label: "En cours",
    icon: Clock,
    pill: "bg-blue-100 text-[#305CDE] dark:bg-[#305CDE]/40 dark:text-[#305CDE]",
    dot: "bg-[#305CDE]",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-[#305CDE]",
  },
  en_attente: {
    label: "En attente",
    icon: Hourglass,
    pill: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    dot: "bg-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-800",
  },
  echoue: {
    label: "Échoué",
    icon: XCircle,
    pill: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    dot: "bg-red-500",
    bg: "bg-red-50 dark:bg-red-950/20",
    border: "border-red-200 dark:border-red-800",
  },
  annule: {
    label: "Annulé",
    icon: Ban,
    pill: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    dot: "bg-gray-400",
    bg: "bg-gray-50 dark:bg-gray-900/30",
    border: "border-gray-200 dark:border-gray-700",
  },
};

const FILTRES: { value: StatutAffiche | ""; label: string }[] = [
  { value: "", label: "Toutes" },
  { value: "confirme", label: "Confirmées" },
  { value: "en_cours", label: "En cours" },
  { value: "en_attente", label: "En attente" },
  { value: "echoue", label: "Échouées" },
  { value: "annule", label: "Annulées" },
];

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ──────────────────────────────────────────────────────────────
// Composant principal
// ──────────────────────────────────────────────────────────────

export default function VentesDigitalesPage() {
  const { toast } = useToast();

  const [boutique, setBoutique] = useState<any>(null);
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [filterStatut, setFilterStatut] = useState<StatutAffiche | "">("");

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const userId = getNexoraUser()?.id;
    if (!userId) { setLoading(false); setRefreshing(false); return; }

    const { data: b } = await supabase
      .from("boutiques" as any)
      .select("*")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (b) {
      setBoutique(b);
      const { data } = await supabase
        .from("commandes" as any)
        .select("*")
        .eq("boutique_id", (b as any).id)
        .order("created_at", { ascending: false });

      // Filtrer les commandes contenant au moins un article numérique
      const filtered = (data as any[] || []).filter(cmd => {
        const items = cmd.items || [];
        return items.some((item: any) => item.type === "numerique");
      });

      setVentes(filtered as Vente[]);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  // ── Stats ──────────────────────────────────────────────────
  const stats = {
    total: ventes.length,
    confirmes: ventes.filter(v => getStatutAffiche(v) === "confirme").length,
    enCours: ventes.filter(v => getStatutAffiche(v) === "en_cours").length,
    enAttente: ventes.filter(v => getStatutAffiche(v) === "en_attente").length,
    echoues: ventes.filter(v => getStatutAffiche(v) === "echoue").length,
    chiffre: ventes
      .filter(v => getStatutAffiche(v) === "confirme")
      .reduce((s, v) => s + v.total, 0),
  };

  // ── Filtre + recherche ─────────────────────────────────────
  const filtered = ventes.filter(v => {
    const statut = getStatutAffiche(v);
    const matchSearch =
      v.client_nom.toLowerCase().includes(searchQ.toLowerCase()) ||
      v.numero.toLowerCase().includes(searchQ.toLowerCase()) ||
      (v.kkiapay_id || "").toLowerCase().includes(searchQ.toLowerCase());
    const matchStatut = filterStatut ? statut === filterStatut : true;
    return matchSearch && matchStatut;
  });

  return (
    <BoutiqueLayout boutiqueName={boutique?.nom} boutiqueSlug={boutique?.slug}>
      <div className="space-y-5 pb-10">

        {/* ── Header ───────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#305CDE]" />
              <h1 className="text-2xl font-black text-gray-800 dark:text-gray-100">
                Ventes Digitales
              </h1>

            </div>

          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-[#305CDE] dark:text-[#305CDE] bg-[#305CDE]/5 dark:bg-[#305CDE]/20 border border-[#305CDE] dark:border-[#305CDE] px-3 py-2 rounded-xl hover:bg-[#305CDE] dark:hover:bg-[#305CDE]/40 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>



        {/* ── Stats ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 bg-gradient-to-br from-[#305CDE] to-[#305CDE] rounded-2xl p-4 text-white">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 opacity-80" />
              <p className="text-xs opacity-80 font-medium">Chiffre d'affaires confirmé</p>
            </div>
            <p className="text-3xl font-black">
              {formatMontant(stats.chiffre, boutique?.devise || "XOF")}
            </p>
            <p className="text-xs opacity-70 mt-1">{stats.confirmes} vente{stats.confirmes > 1 ? "s" : ""} confirmée{stats.confirmes > 1 ? "s" : ""}</p>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full bg-[#008000]" />
              <p className="text-xs text-[#008000] dark:text-[#008000] font-medium">Confirmées</p>
            </div>
            <p className="text-3xl font-black text-[#008000] dark:text-emerald-300">{stats.confirmes}</p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">En attente</p>
            </div>
            <p className="text-3xl font-black text-amber-700 dark:text-amber-300">{stats.enAttente}</p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-[#305CDE] rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full bg-[#305CDE]" />
              <p className="text-xs text-[#305CDE] dark:text-[#305CDE] font-medium">En cours</p>
            </div>
            <p className="text-3xl font-black text-[#305CDE] dark:text-[#305CDE]">{stats.enCours}</p>
          </div>

          <div className="bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">Échouées</p>
            </div>
            <p className="text-3xl font-black text-red-700 dark:text-red-300">{stats.echoues}</p>
          </div>
        </div>

        {/* ── Filtres ───────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Client, numéro, ID transaction..."
              className="pl-9 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>

          {/* Onglets filtres statut */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {FILTRES.map(f => (
              <button
                key={f.value}
                onClick={() => setFilterStatut(f.value as any)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${
                  filterStatut === f.value
                    ? "bg-[#305CDE] text-white shadow-sm shadow-purple-200 dark:shadow-purple-900"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Liste ─────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-14">
            <div className="w-8 h-8 border-4 border-[#305CDE] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl">
            <Zap className="w-12 h-12 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Aucune vente digitale</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {filterStatut ? "Essayez un autre filtre" : "Les ventes apparaîtront ici après paiement"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(vente => {
              const statut = getStatutAffiche(vente);
              const cfg = STATUTS_CONFIG[statut];
              const Icon = cfg.icon;
              const isExpanded = expandedId === vente.id;
              const items: any[] = Array.isArray(vente.items) ? vente.items : [];

              return (
                <div
                  key={vente.id}
                  className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm"
                >
                  {/* Barre de couleur statut en haut */}
                  <div className={`h-1 w-full ${cfg.dot}`} />

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">

                        {/* Numéro + badge statut */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[#305CDE] dark:text-[#305CDE] text-sm">
                            #{vente.numero}
                          </span>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 ${cfg.pill}`}>
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                          <span className="text-xs bg-[#305CDE] dark:bg-[#305CDE]/40 text-[#305CDE] dark:text-[#305CDE] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Digital
                          </span>
                        </div>

                        <p className="font-semibold text-gray-800 dark:text-gray-100 mt-1">
                          {vente.client_nom}
                        </p>

                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
                          {vente.client_tel && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />{vente.client_tel}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />{formatDate(vente.created_at)}
                          </span>
                        </div>

                        <div className="text-lg font-black text-[#305CDE] dark:text-[#305CDE] mt-1">
                          {formatMontant(vente.total, vente.devise)}
                        </div>
                      </div>

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : vente.id)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                      >
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          : <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
                      </button>
                    </div>
                  </div>

                  {/* ── Détail expandé ─────────────────────── */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4 space-y-4">

                      {/* Statut automatique — explication */}
                      <div className={`flex items-start gap-3 rounded-xl p-3 border ${cfg.bg} ${cfg.border}`}>
                        <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.pill.split(" ")[1]}`} />
                        <div>
                          <p className={`text-xs font-bold ${cfg.pill.split(" ")[1]}`}>{cfg.label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {statut === "confirme" && "Paiement vérifié et confirmé par KKiaPay. Le portefeuille vendeur a été crédité."}
                            {statut === "en_cours" && "Paiement en cours de traitement par KKiaPay."}
                            {statut === "en_attente" && "Le client a initié le paiement. En attente de confirmation KKiaPay."}
                            {statut === "echoue" && "Le paiement a échoué côté KKiaPay. Aucun montant n'a été débité."}
                            {statut === "annule" && "La vente a été annulée avant paiement."}
                          </p>
                        </div>
                      </div>

                      {/* Transaction KKiaPay */}
                      {vente.kkiapay_id && (
                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                            ID Transaction KKiaPay
                          </p>
                          <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
                            {vente.kkiapay_id}
                          </p>
                        </div>
                      )}

                      {/* Articles */}
                      {items.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Produit</p>
                          <div className="space-y-2">
                            {items.map((art: any, i: number) => (
                              <div
                                key={i}
                                className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3"
                              >
                                <div className="w-10 h-10 rounded-lg bg-[#305CDE] dark:bg-[#305CDE]/40 flex-shrink-0 flex items-center justify-center">
                                  {art.photo_url
                                    ? <img src={art.photo_url} alt="" className="w-full h-full object-cover rounded-lg" />
                                    : <Zap className="w-5 h-5 text-[#305CDE]" />
                                  }
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">
                                    {art.nom_produit || art.nom || "Produit digital"}
                                  </p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500">
                                    {formatMontant(art.prix_unitaire || art.prix || 0, vente.devise)}
                                  </p>
                                </div>
                                <span className="font-bold text-[#305CDE] dark:text-[#305CDE] text-sm flex-shrink-0">
                                  {formatMontant(art.montant || 0, vente.devise)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Infos client */}
                      {(vente.client_email) && (
                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Contact client</p>
                          {vente.client_email && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{vente.client_email}</p>
                          )}
                        </div>
                      )}

                      {/* Contact client */}
                      {vente.client_tel && (
                        <div className="flex gap-2">
                          <a
                            href={`tel:${vente.client_tel}`}
                            className="flex-1 flex items-center justify-center gap-2 bg-[#008000] text-white rounded-xl py-2.5 text-sm font-semibold"
                          >
                            <Phone className="w-4 h-4" /> Appeler
                          </a>
                          <a
                            href={`https://wa.me/${vente.client_tel.replace(/[^0-9]/g, "")}?text=Bonjour ${vente.client_nom}, concernant votre achat #${vente.numero}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-xl py-2.5 text-sm font-semibold"
                          >
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
