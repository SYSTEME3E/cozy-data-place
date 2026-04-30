import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BoutiqueLayout from "@/components/BoutiqueLayout";
import { getNexoraUser, hasNexoraPremium } from "@/lib/nexora-auth";
import { useNavigate } from "react-router-dom";
import {
  Wallet, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle,
  XCircle, Users, TrendingUp, Zap, AlertCircle, Phone,
  ChevronDown, ChevronUp, Search, Crown, Loader2,
  BadgeCheck, X, MapPin, Mail, ShoppingBag, Timer
} from "lucide-react";

// ─────────────────────────────────────────────
// PAYS + RÉSEAUX MOBILE MONEY
// ─────────────────────────────────────────────

const PAYS_RESEAUX: Record<string, string[]> = {
  "Bénin":           ["MTN MoMo", "Moov Money", "Celtis"],
  "Togo":            ["Flooz (Moov)", "T-Money"],
  "Côte d'Ivoire":   ["Orange Money", "MTN MoMo", "Wave", "Moov Money"],
  "Sénégal":         ["Orange Money", "Wave", "Free Money"],
  "Mali":            ["Orange Money", "Moov Money", "Sama Money"],
  "Burkina Faso":    ["Orange Money", "Moov Money", "Coris Money"],
  "Niger":           ["Airtel Money", "Moov Money"],
  "Guinée":          ["Orange Money", "MTN MoMo"],
  "Cameroun":        ["Orange Money", "MTN MoMo"],
  "Ghana":           ["MTN MoMo", "Vodafone Cash", "AirtelTigo"],
  "Nigeria":         ["Opay", "Palmpay", "MTN MoMo"],
  "Kenya":           ["M-Pesa", "Airtel Money"],
  "Tanzanie":        ["M-Pesa", "Airtel Money", "Tigo Pesa"],
  "Rwanda":          ["MTN MoMo", "Airtel Money"],
  "France":          ["Lydia", "Paylib"],
  "États-Unis":      ["Cash App", "Zelle"],
  "Canada":          ["Interac"],
  "Autre":           ["Mobile Money", "Virement bancaire"],
};

const PAYS_LIST = Object.keys(PAYS_RESEAUX);

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type StatutRetrait = "en_attente" | "traitement" | "complete" | "refuse";

interface VenteDigitale {
  id: string;
  numero: string;
  client_nom: string;
  client_telephone: string;
  client_email: string | null;
  client_pays: string;
  client_ville: string;
  total: number;
  devise: string;
  commission: number;       // 5% prélevé
  net_vendeur: number;      // total - commission
  statut_paiement: string;
  created_at: string;
  produit_nom: string;
  produit_type: string;
  disponible_retrait: boolean; // true si > 24h après vente
  heures_restantes: number;    // heures avant disponibilité
}

interface Retrait {
  id: string;
  montant: number;
  devise: string;
  statut: StatutRetrait;
  pays: string;
  reseau: string;
  numero_mobile: string;
  nom_beneficiaire: string;
  created_at: string;
  completed_at: string | null;
  reference: string;
}

// ─────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────

const fmt = (n: number, devise = "FCFA") =>
  `${Math.round(n).toLocaleString("fr-FR")} ${devise}`;

const formatDate = (dt: string) =>
  new Date(dt).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const heuresDepuis = (dt: string): number => {
  const diff = Date.now() - new Date(dt).getTime();
  return diff / (1000 * 60 * 60);
};

const generateRef = () => `RET-${Date.now().toString().slice(-8)}`;

// ─────────────────────────────────────────────
// DONNÉES MOCK (remplacer par Supabase)
// ─────────────────────────────────────────────

const buildMockVentes = (): VenteDigitale[] => {
  const now = Date.now();
  const raw = [
    { id: "1", numero: "CMD-001", client_nom: "Kofi Mensah",    client_telephone: "+229 97 12 34 56", client_email: "kofi@gmail.com",    client_pays: "Bénin",         client_ville: "Cotonou",  total: 15000, devise: "FCFA", statut_paiement: "paye", created_at: new Date(now - 30 * 3600000).toISOString(), produit_nom: "Formation SEO", produit_type: "digital" },
    { id: "2", numero: "CMD-002", client_nom: "Awa Diallo",     client_telephone: "+221 77 98 76 54", client_email: "awa@gmail.com",     client_pays: "Sénégal",       client_ville: "Dakar",    total: 25000, devise: "FCFA", statut_paiement: "paye", created_at: new Date(now - 50 * 3600000).toISOString(), produit_nom: "Pack Canva Pro", produit_type: "digital" },
    { id: "3", numero: "CMD-003", client_nom: "Yao Kouassi",    client_telephone: "+225 07 45 67 89", client_email: null,                client_pays: "Côte d'Ivoire", client_ville: "Abidjan",  total: 8000,  devise: "FCFA", statut_paiement: "paye", created_at: new Date(now - 5 * 3600000).toISOString(),  produit_nom: "CV Template",   produit_type: "digital" },
    { id: "4", numero: "CMD-004", client_nom: "Fatou Camara",   client_telephone: "+224 62 11 22 33", client_email: "fatou@yahoo.fr",    client_pays: "Guinée",        client_ville: "Conakry",  total: 12000, devise: "FCFA", statut_paiement: "paye", created_at: new Date(now - 72 * 3600000).toISOString(), produit_nom: "Ebook Business", produit_type: "digital" },
    { id: "5", numero: "CMD-005", client_nom: "Moussa Ouédraogo", client_telephone: "+226 70 33 44 55", client_email: null,             client_pays: "Burkina Faso",  client_ville: "Ouaga",    total: 5000,  devise: "FCFA", statut_paiement: "paye", created_at: new Date(now - 2 * 3600000).toISOString(),  produit_nom: "Logo Design",   produit_type: "digital" },
    { id: "6", numero: "CMD-006", client_nom: "Akosua Asante",  client_telephone: "+233 55 66 77 88", client_email: "akosua@gmail.com", client_pays: "Ghana",         client_ville: "Accra",    total: 20000, devise: "FCFA", statut_paiement: "paye", created_at: new Date(now - 48 * 3600000).toISOString(), produit_nom: "Cours Excel",    produit_type: "digital" },
  ];

  return raw.map(v => {
    const heures = heuresDepuis(v.created_at);
    const commission = Math.round(v.total * 0.05);
    return {
      ...v,
      commission,
      net_vendeur: v.total - commission,
      disponible_retrait: heures >= 24,
      heures_restantes: Math.max(0, 24 - heures),
    };
  });
};

const MOCK_RETRAITS: Retrait[] = [
  { id: "r1", montant: 35000, devise: "FCFA", statut: "complete",   pays: "Bénin",   reseau: "MTN MoMo",    numero_mobile: "+229 97 00 11 22", nom_beneficiaire: "Jean Kpakpo",   created_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString(), completed_at: new Date(Date.now() - 3 * 24 * 3600000 + 5 * 60000).toISOString(), reference: "RET-20250001" },
  { id: "r2", montant: 18000, devise: "FCFA", statut: "traitement", pays: "Bénin",   reseau: "Moov Money",  numero_mobile: "+229 96 55 44 33", nom_beneficiaire: "Jean Kpakpo",   created_at: new Date(Date.now() - 30 * 60000).toISOString(),             completed_at: null,                                                              reference: "RET-20250002" },
];

// ─────────────────────────────────────────────
// STATUTS RETRAIT
// ─────────────────────────────────────────────

const STATUT_RETRAIT: Record<StatutRetrait, { label: string; color: string; bg: string; icon: any }> = {
  en_attente:  { label: "En attente",  color: "text-yellow-700", bg: "bg-yellow-50  border-yellow-200", icon: Clock },
  traitement:  { label: "En cours",    color: "text-[#305CDE]",   bg: "bg-blue-50    border-blue-200",   icon: Loader2 },
  complete:    { label: "Reçu",        color: "text-[#008000]",  bg: "bg-green-50   border-green-200",  icon: CheckCircle },
  refuse:      { label: "Refusé",      color: "text-red-700",    bg: "bg-red-50     border-red-200",    icon: XCircle },
};

// ─────────────────────────────────────────────
// MODAL RETRAIT
// ─────────────────────────────────────────────

interface ModalRetraitProps {
  solde: number;
  devise: string;
  onClose: () => void;
  onConfirm: (data: { montant: number; pays: string; reseau: string; numero: string; nom: string }) => void;
}

function ModalRetrait({ solde, devise, onClose, onConfirm }: ModalRetraitProps) {
  const [montant, setMontant]   = useState("");
  const [pays, setPays]         = useState("Bénin");
  const [reseau, setReseau]     = useState(PAYS_RESEAUX["Bénin"][0]);
  const [numero, setNumero]     = useState("");
  const [nom, setNom]           = useState("");
  const [loading, setLoading]   = useState(false);

  const montantNum = parseFloat(montant) || 0;
  const valid = montantNum >= 500 && montantNum <= solde && pays && reseau && numero.length >= 8 && nom.trim().length >= 3;

  const handlePaysChange = (p: string) => {
    setPays(p);
    setReseau(PAYS_RESEAUX[p]?.[0] || "");
  };

  const handleSubmit = async () => {
    if (!valid) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 2200));
    setLoading(false);
    onConfirm({ montant: montantNum, pays, reseau, numero, nom });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="relative bg-gradient-to-br from-[#FF1A00] to-rose-600 p-6 text-white">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2 blur-xl" />
          <div className="flex items-center justify-between relative">
            <div>
              <p className="text-xs font-black tracking-widest opacity-70 uppercase">Effectuer un</p>
              <h3 className="text-2xl font-black">Retrait</h3>
            </div>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-2xl bg-white/20 hover:bg-white/30 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-4 bg-white/15 rounded-2xl px-4 py-3">
            <p className="text-xs opacity-70">Solde disponible</p>
            <p className="text-2xl font-black">{fmt(solde, devise)}</p>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">

          {/* Montant */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Montant à retirer</label>
            <div className="relative">
              <input type="number" value={montant} onChange={e => setMontant(e.target.value)}
                placeholder="Ex: 10000" min={500} max={solde}
                className="w-full px-4 py-3.5 pr-20 bg-gray-50 border-2 border-gray-200 focus:border-[#FF1A00] rounded-2xl text-xl font-black outline-none transition-colors" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 dark:text-gray-500">{devise}</span>
            </div>
            {montantNum > solde && (
              <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Solde insuffisant
              </p>
            )}
            <div className="flex gap-2 mt-2">
              {[1000, 5000, 10000, 25000].filter(v => v <= solde).map(v => (
                <button key={v} type="button" onClick={() => setMontant(String(v))}
                  className="flex-1 py-1.5 text-xs font-black rounded-xl bg-[#FF1A00]/5 text-[#FF1A00] hover:bg-[#FF1A00] transition-colors border border-[#FF1A00]">
                  {(v / 1000)}k
                </button>
              ))}
              <button type="button" onClick={() => setMontant(String(solde))}
                className="flex-1 py-1.5 text-xs font-black rounded-xl bg-[#FF1A00] text-white hover:bg-[#FF1A00] transition-colors">
                Max
              </button>
            </div>
          </div>

          {/* Nom bénéficiaire */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Nom & Prénom du bénéficiaire</label>
            <input type="text" value={nom} onChange={e => setNom(e.target.value)}
              placeholder="Jean Dupont"
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 focus:border-[#FF1A00] rounded-2xl text-sm font-semibold outline-none transition-colors" />
          </div>

          {/* Pays */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Pays</label>
            <select value={pays} onChange={e => handlePaysChange(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 focus:border-[#FF1A00] rounded-2xl text-sm font-semibold outline-none transition-colors">
              {PAYS_LIST.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Réseau */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Réseau Mobile Money</label>
            <div className="grid grid-cols-2 gap-2">
              {(PAYS_RESEAUX[pays] || []).map(r => (
                <button key={r} type="button" onClick={() => setReseau(r)}
                  className={`py-3 px-3 rounded-2xl text-sm font-black border-2 transition-all ${
                    reseau === r
                      ? "border-[#FF1A00] bg-[#FF1A00]/5 text-[#FF1A00] shadow-sm shadow-pink-100"
                      : "border-gray-200 bg-gray-50 text-gray-600 hover:border-[#FF1A00]"
                  }`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Numéro */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Numéro Mobile Money</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input type="tel" value={numero} onChange={e => setNumero(e.target.value)}
                placeholder="+229 97 00 00 00"
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-gray-200 focus:border-[#FF1A00] rounded-2xl text-sm font-semibold outline-none transition-colors" />
            </div>
          </div>

          {/* Avertissement délai */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <Timer className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 leading-relaxed">
              <strong>Délai de traitement : 5 minutes</strong> après confirmation. L'argent arrivera sur le numéro indiqué.
            </p>
          </div>

          <button onClick={handleSubmit} disabled={!valid || loading}
            className="w-full py-4 bg-gradient-to-r from-[#FF1A00] to-rose-500 hover:from-[#FF1A00] hover:to-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-200 text-sm">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Traitement en cours...</>
              : <><ArrowUpRight className="w-4 h-4" /> Retirer {montantNum > 0 ? fmt(montantNum, devise) : ""}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CARTE VENTE DIGITALE
// ─────────────────────────────────────────────

function CarteVente({ vente }: { vente: VenteDigitale }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              vente.disponible_retrait ? "bg-[#008000]" : "bg-amber-100"
            }`}>
              {vente.disponible_retrait
                ? <CheckCircle className="w-5 h-5 text-[#008000]" />
                : <Clock className="w-5 h-5 text-amber-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-xs text-[#FF1A00]">#{vente.numero}</span>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-blue-100 text-[#305CDE] flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Digital
                </span>
              </div>
              <p className="font-bold text-gray-800 text-sm mt-0.5 truncate">{vente.produit_nom}</p>
              <p className="text-xs text-gray-400 mt-0.5">{vente.client_nom} · {formatDate(vente.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="font-black text-[#FF1A00]">{fmt(vente.net_vendeur, vente.devise)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">net vendeur</p>
            </div>
            <button onClick={() => setExpanded(!expanded)}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0">
              {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
            </button>
          </div>
        </div>

        {/* Barre disponibilité */}
        {!vente.disponible_retrait && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-amber-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full transition-all"
                style={{ width: `${((24 - vente.heures_restantes) / 24) * 100}%` }} />
            </div>
            <span className="text-xs font-bold text-amber-600 whitespace-nowrap">
              {vente.heures_restantes.toFixed(0)}h restantes
            </span>
          </div>
        )}
        {vente.disponible_retrait && (
          <div className="mt-2">
            <span className="text-xs font-black text-[#008000] flex items-center gap-1">
              <BadgeCheck className="w-3.5 h-3.5" /> Disponible pour retrait
            </span>
          </div>
        )}
      </div>

      {/* Détails expandés */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/80 p-4 space-y-3">
          {/* Résumé financier */}
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-3 space-y-2">
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Détail financier</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Prix vendu</span>
              <span className="font-bold">{fmt(vente.total, vente.devise)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-red-100 text-[#FF1A00] text-[10px] font-black flex items-center justify-center">%</span>
                Commission plateforme (5%)
              </span>
              <span className="font-bold text-red-500">− {fmt(vente.commission, vente.devise)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-dashed border-gray-200 pt-2">
              <span className="font-black text-gray-700 dark:text-gray-200">Votre gain net</span>
              <span className="font-black text-[#008000]">{fmt(vente.net_vendeur, vente.devise)}</span>
            </div>
          </div>

          {/* Infos client */}
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-3 space-y-2">
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Coordonnées client</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="font-semibold truncate">{vente.client_nom}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="font-semibold">{vente.client_telephone}</span>
              </div>
              {vente.client_email && (
                <div className="flex items-center gap-2 text-gray-600 col-span-2">
                  <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="font-semibold truncate">{vente.client_email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="font-semibold">{vente.client_ville}, {vente.client_pays}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────

type Tab = "apercu" | "ventes" | "retraits" | "clients";

export default function DigitalFinancePage() {
  const { toast } = useToast();
  const navigate  = useNavigate();
  const isPremium = hasNexoraPremium();

  const [boutique, setBoutique]     = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState<Tab>("apercu");
  const [ventes, setVentes]         = useState<VenteDigitale[]>([]);
  const [retraits, setRetraits]     = useState<Retrait[]>(MOCK_RETRAITS);
  const [showModal, setShowModal]   = useState(false);
  const [searchVente, setSearchVente] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Calculs solde ──
  const totalGains     = ventes.filter(v => v.disponible_retrait).reduce((s, v) => s + v.net_vendeur, 0);
  const totalEnAttente = ventes.filter(v => !v.disponible_retrait).reduce((s, v) => s + v.net_vendeur, 0);
  const totalRetire    = retraits.filter(r => r.statut === "complete").reduce((s, r) => s + r.montant, 0);
  const soldeDisponible = Math.max(0, totalGains - totalRetire);
  const devise          = boutique?.devise || "FCFA";

  // Stats clients uniques
  const clientsUniques = [...new Map(ventes.map(v => [v.client_telephone, v])).values()];
  const clientsFiltres  = clientsUniques.filter(c =>
    c.client_nom.toLowerCase().includes(searchVente.toLowerCase()) ||
    c.client_telephone.includes(searchVente)
  );

  const ventesFiltrees = ventes.filter(v =>
    v.client_nom.toLowerCase().includes(searchVente.toLowerCase()) ||
    v.produit_nom.toLowerCase().includes(searchVente.toLowerCase()) ||
    v.numero.includes(searchVente)
  );

  // ── Load ──
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: b } = await supabase
          .from("boutiques" as any).select("*").limit(1).single();
        if (b) setBoutique(b);
      } catch {}
      // Utilise les données mock pour l'instant
      setVentes(buildMockVentes());
      setLoading(false);
    };
    load();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4500);
  };

  const handleRetrait = (data: { montant: number; pays: string; reseau: string; numero: string; nom: string }) => {
    const newRetrait: Retrait = {
      id: Date.now().toString(),
      montant: data.montant,
      devise,
      statut: "traitement",
      pays: data.pays,
      reseau: data.reseau,
      numero_mobile: data.numero,
      nom_beneficiaire: data.nom,
      created_at: new Date().toISOString(),
      completed_at: null,
      reference: generateRef(),
    };
    setRetraits(prev => [newRetrait, ...prev]);
    setShowModal(false);
    showSuccess(`✅ Retrait de ${fmt(data.montant, devise)} initié — Arrivée dans ~5 minutes`);

    // Simuler la complétion après 5 secondes (pour la démo)
    setTimeout(() => {
      setRetraits(prev => prev.map(r =>
        r.id === newRetrait.id
          ? { ...r, statut: "complete", completed_at: new Date().toISOString() }
          : r
      ));
      showSuccess(`💰 Retrait de ${fmt(data.montant, devise)} reçu sur ${data.reseau} !`);
    }, 5000);
  };

  // ── Mur premium ──
  if (!isPremium) {
    return (
      <BoutiqueLayout boutiqueName="Nexora Shop">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center mb-6 shadow-lg">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">Fonctionnalité Premium</h2>
          <p className="text-gray-500 text-sm mb-8 max-w-xs">
            La gestion des retraits est réservée aux membres <span className="font-bold text-yellow-600">Premium</span>.
          </p>
          <button onClick={() => navigate("/abonnement")}
            className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold px-8 py-3 rounded-xl shadow-md transition-all hover:scale-105">
            <Crown className="w-4 h-4" /> Voir les plans
          </button>
          <button onClick={() => navigate("/boutique")}
            className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Retour à la boutique
          </button>
        </div>
      </BoutiqueLayout>
    );
  }

  if (loading) return (
    <BoutiqueLayout boutiqueName={boutique?.nom}>
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-[#FF1A00] border-t-transparent rounded-full animate-spin" />
      </div>
    </BoutiqueLayout>
  );

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "apercu",   label: "Aperçu",     icon: TrendingUp },
    { id: "ventes",   label: "Ventes",     icon: ShoppingBag },
    { id: "retraits", label: "Retraits",   icon: Wallet },
    { id: "clients",  label: "Clients",    icon: Users },
  ];

  return (
    <BoutiqueLayout boutiqueName={boutique?.nom} boutiqueSlug={boutique?.slug}>

      {/* Toast succès */}
      {successMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-gray-900 text-white rounded-2xl shadow-2xl font-semibold text-sm flex items-center gap-2 max-w-sm text-center">
          {successMsg}
        </div>
      )}

      <div className="space-y-5 pb-12">

        {/* ── HERO SOLDE ── */}
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-gray-900 via-[#FF1A00] to-rose-900 p-6 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[#FF1A00]/20 -translate-y-1/3 translate-x-1/3 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full bg-[#FF1A00]/20 translate-y-1/3 -translate-x-1/3 blur-2xl pointer-events-none" />

          <div className="relative">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-black tracking-[4px] opacity-50 uppercase">Produits Digitaux</p>
                <h1 className="text-xl font-black tracking-wide">Finances & Retraits</h1>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#FF1A00]" />
              </div>
            </div>

            {/* Solde principal */}
            <div className="mb-5">
              <p className="text-xs text-white/50 font-bold uppercase tracking-widest mb-1">Solde disponible</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black tracking-tight">{Math.round(soldeDisponible).toLocaleString("fr-FR")}</span>
                <span className="text-xl font-bold text-white/50 mb-1">{devise}</span>
              </div>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="bg-white/10 rounded-2xl p-3 text-center">
                <p className="text-xs text-white/50 font-bold">En attente</p>
                <p className="text-base font-black text-amber-300">{Math.round(totalEnAttente).toLocaleString()}</p>
                <p className="text-[10px] text-white/40">{devise}</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-3 text-center">
                <p className="text-xs text-white/50 font-bold">Ventes</p>
                <p className="text-base font-black">{ventes.length}</p>
                <p className="text-[10px] text-white/40">totales</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-3 text-center">
                <p className="text-xs text-white/50 font-bold">Retiré</p>
                <p className="text-base font-black text-[#008000]">{Math.round(totalRetire).toLocaleString()}</p>
                <p className="text-[10px] text-white/40">{devise}</p>
              </div>
            </div>

            {/* Bouton retrait */}
            <button
              onClick={() => soldeDisponible >= 500 ? setShowModal(true) : toast({ title: "Solde insuffisant (min. 500 FCFA)", variant: "destructive" })}
              className="w-full py-3.5 bg-white text-gray-900 font-black rounded-2xl transition-all hover:bg-[#FF1A00] hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 shadow-lg">
              <ArrowUpRight className="w-5 h-5 text-[#FF1A00]" />
              Effectuer un retrait
            </button>
          </div>
        </div>

        {/* Info commission */}
        <div className="flex items-start gap-3 p-4 bg-[#FF1A00]/5 border border-[#FF1A00] rounded-2xl">
          <div className="w-7 h-7 rounded-xl bg-[#FF1A00] flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-black">5%</span>
          </div>
          <div>
            <p className="text-sm font-black text-[#FF1A00]">Commission sur ventes digitales</p>
            <p className="text-xs text-[#FF1A00] mt-0.5">
              5% prélevés automatiquement sur chaque vente. Retrait disponible <strong>24h après la vente</strong>. Délai de traitement : <strong>5 minutes</strong>.
            </p>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all flex-shrink-0 ${
                activeTab === tab.id
                  ? "bg-[#FF1A00] text-white shadow-lg shadow-pink-200"
                  : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:border-[#FF1A00] hover:text-[#FF1A00]"
              }`}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════
            TAB : APERÇU
        ══════════════════════════════════════ */}
        {activeTab === "apercu" && (
          <div className="space-y-4">
            {/* Stats globales */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-5 shadow-sm">
                <div className="w-9 h-9 rounded-2xl bg-[#008000] flex items-center justify-center mb-3">
                  <TrendingUp className="w-4 h-4 text-[#008000]" />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Gains totaux</p>
                <p className="text-2xl font-black text-gray-800 dark:text-gray-100">{Math.round(totalGains).toLocaleString()}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{devise}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-5 shadow-sm">
                <div className="w-9 h-9 rounded-2xl bg-[#305CDE] flex items-center justify-center mb-3">
                  <Zap className="w-4 h-4 text-[#305CDE]" />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Produits vendus</p>
                <p className="text-2xl font-black text-gray-800 dark:text-gray-100">{ventes.length}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">digitaux</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-5 shadow-sm">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 flex items-center justify-center mb-3">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">En attente 24h</p>
                <p className="text-2xl font-black text-amber-600">{Math.round(totalEnAttente).toLocaleString()}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{devise}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-5 shadow-sm">
                <div className="w-9 h-9 rounded-2xl bg-blue-100 flex items-center justify-center mb-3">
                  <Users className="w-4 h-4 text-[#305CDE]" />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Clients uniques</p>
                <p className="text-2xl font-black text-gray-800 dark:text-gray-100">{clientsUniques.length}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">acheteurs</p>
              </div>
            </div>

            {/* Ventes récentes */}
            <div>
              <h3 className="font-black text-gray-800 text-sm mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#FF1A00]" /> Ventes récentes
              </h3>
              <div className="space-y-2">
                {ventes.slice(0, 3).map(v => (
                  <div key={v.id} className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-3 shadow-sm">
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${v.disponible_retrait ? "bg-[#008000]" : "bg-amber-100"}`}>
                      {v.disponible_retrait
                        ? <CheckCircle className="w-4 h-4 text-[#008000]" />
                        : <Clock className="w-4 h-4 text-amber-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-800 truncate">{v.produit_nom}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{v.client_nom}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-[#FF1A00] text-sm">{fmt(v.net_vendeur, devise)}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">net</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB : VENTES
        ══════════════════════════════════════ */}
        {activeTab === "ventes" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input value={searchVente} onChange={e => setSearchVente(e.target.value)}
                placeholder="Produit, client, numéro..."
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm outline-none focus:border-[#FF1A00] transition-colors" />
            </div>

            {/* Légende */}
            <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-[#008000]" /> Disponible retrait</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-500" /> Attente 24h</span>
            </div>

            {ventesFiltrees.length === 0 ? (
              <div className="text-center py-14 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl">
                <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-bold">Aucune vente digitale</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ventesFiltrees.map(v => <CarteVente key={v.id} vente={v} />)}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB : RETRAITS
        ══════════════════════════════════════ */}
        {activeTab === "retraits" && (
          <div className="space-y-4">
            <button onClick={() => setShowModal(true)}
              className="w-full py-3.5 bg-gradient-to-r from-[#FF1A00] to-rose-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-pink-200 hover:scale-[1.01] transition-all">
              <ArrowUpRight className="w-5 h-5" /> Nouveau retrait
            </button>

            {retraits.length === 0 ? (
              <div className="text-center py-14 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl">
                <Wallet className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-bold">Aucun retrait effectué</p>
              </div>
            ) : (
              <div className="space-y-3">
                {retraits.map(r => {
                  const S = STATUT_RETRAIT[r.statut];
                  const Icon = S.icon;
                  return (
                    <div key={r.id} className={`bg-white border-2 rounded-3xl overflow-hidden ${S.bg}`}>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${S.bg}`}>
                              <Icon className={`w-5 h-5 ${S.color} ${r.statut === "traitement" ? "animate-spin" : ""}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${S.bg} ${S.color}`}>
                                  {S.label}
                                </span>
                                <span className="text-xs text-gray-400 font-mono">{r.reference}</span>
                              </div>
                              <p className="font-bold text-gray-800 mt-1">{r.nom_beneficiaire}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {r.reseau} · {r.numero_mobile} · {r.pays}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(r.created_at)}</p>
                              {r.statut === "traitement" && (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <Timer className="w-3.5 h-3.5 text-[#305CDE]" />
                                  <span className="text-xs text-[#305CDE] font-bold">Arrivée dans ~5 minutes</span>
                                </div>
                              )}
                              {r.completed_at && (
                                <p className="text-xs text-[#008000] font-bold mt-1 flex items-center gap-1">
                                  <BadgeCheck className="w-3.5 h-3.5" /> Reçu le {formatDate(r.completed_at)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-black text-xl text-gray-900">{fmt(r.montant, r.devise)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB : CLIENTS
        ══════════════════════════════════════ */}
        {activeTab === "clients" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input value={searchVente} onChange={e => setSearchVente(e.target.value)}
                placeholder="Rechercher un client..."
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm outline-none focus:border-[#FF1A00] transition-colors" />
            </div>

            <p className="text-xs text-gray-400 font-bold">{clientsFiltres.length} client{clientsFiltres.length > 1 ? "s" : ""} unique{clientsFiltres.length > 1 ? "s" : ""}</p>

            {clientsFiltres.length === 0 ? (
              <div className="text-center py-14 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl">
                <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-bold">Aucun client</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientsFiltres.map(client => {
                  const achatsClient = ventes.filter(v => v.client_telephone === client.client_telephone);
                  const totalClient  = achatsClient.reduce((s, v) => s + v.total, 0);
                  return (
                    <div key={client.client_telephone} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FF1A00] to-rose-500 flex items-center justify-center text-white font-black text-base flex-shrink-0">
                          {client.client_nom.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-gray-800 text-sm">{client.client_nom}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {client.client_telephone}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {client.client_pays}
                            </span>
                          </div>
                          {client.client_email && (
                            <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" /> {client.client_email}
                            </span>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-black text-[#FF1A00]">{fmt(totalClient, devise)}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{achatsClient.length} achat{achatsClient.length > 1 ? "s" : ""}</p>
                        </div>
                      </div>

                      {/* Produits achetés */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {achatsClient.map(a => (
                          <span key={a.id} className="text-xs px-2.5 py-1 bg-[#305CDE]/5 text-[#305CDE] rounded-xl font-semibold border border-[#305CDE] flex items-center gap-1">
                            <Zap className="w-3 h-3" /> {a.produit_nom}
                          </span>
                        ))}
                      </div>

                      {/* Contact rapide */}
                      <div className="flex gap-2 mt-3">
                        <a href={`tel:${client.client_telephone}`}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-600 transition-colors">
                          <Phone className="w-3.5 h-3.5" /> Appeler
                        </a>
                        <a href={`https://wa.me/${client.client_telephone.replace(/[^0-9]/g, "")}?text=Bonjour ${client.client_nom}, merci pour votre achat !`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 rounded-xl text-xs font-bold text-[#25D366] transition-colors border border-[#25D366]/20">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal retrait */}
      {showModal && (
        <ModalRetrait
          solde={soldeDisponible}
          devise={devise}
          onClose={() => setShowModal(false)}
          onConfirm={handleRetrait}
        />
      )}
    </BoutiqueLayout>
  );
}
