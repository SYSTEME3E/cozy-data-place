import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";
import AppLayout from "@/components/AppLayout";
import {
  PiggyBank, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle,
  AlertTriangle, FileText, ShieldCheck, TrendingUp, Lock,
  Loader2, X, Phone, ChevronDown, Search, Timer,
  BadgeCheck, CalendarClock, Banknote, History, Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─────────────────────────────────────────────
// PAYS + RÉSEAUX
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
  "France":          ["Lydia", "Virement bancaire"],
  "États-Unis":      ["Cash App", "Zelle"],
  "Autre":           ["Mobile Money", "Virement bancaire"],
};
const PAYS_LIST = Object.keys(PAYS_RESEAUX);

// ─────────────────────────────────────────────
// PLANS D'ÉPARGNE
// ─────────────────────────────────────────────

const PLANS = [
  {
    id: "libre",
    label: "Épargne Libre",
    duree: null,
    dureeLabel: "Pas de blocage",
    penalite: 10,
    couleur: "from-emerald-400 to-teal-500",
    badge: "bg-emerald-100 text-emerald-700",
    icon: "💰",
    description: "Retirez quand vous voulez avec 10% de pénalité.",
  },
  {
    id: "6mois",
    label: "6 Mois",
    duree: 6,
    dureeLabel: "Bloqué 6 mois",
    penalite: 0,
    couleur: "from-blue-400 to-indigo-500",
    badge: "bg-blue-100 text-blue-700",
    icon: "📅",
    description: "Retirez sans pénalité après 6 mois.",
  },
  {
    id: "1an",
    label: "1 An",
    duree: 12,
    dureeLabel: "Bloqué 1 an",
    penalite: 0,
    couleur: "from-violet-400 to-purple-600",
    badge: "bg-violet-100 text-violet-700",
    icon: "🏆",
    description: "Engagement 1 an pour une discipline maximale.",
  },
  {
    id: "2ans",
    label: "2 Ans",
    duree: 24,
    dureeLabel: "Bloqué 2 ans",
    penalite: 0,
    couleur: "from-amber-400 to-orange-500",
    badge: "bg-amber-100 text-amber-700",
    icon: "🌟",
    description: "Plan long terme pour vos grands projets.",
  },
  {
    id: "3ans",
    label: "3 Ans",
    duree: 36,
    dureeLabel: "Bloqué 3 ans",
    penalite: 0,
    couleur: "from-rose-400 to-pink-600",
    badge: "bg-rose-100 text-rose-700",
    icon: "👑",
    description: "Le plan ultime pour bâtir votre avenir.",
  },
];

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type PlanId = "libre" | "6mois" | "1an" | "2ans" | "3ans";
type TabType = "apercu" | "depot" | "retrait" | "historique";

interface Transaction {
  id: string;
  type: "depot" | "retrait";
  montant: number;
  penalite: number;
  montant_net: number;
  plan: PlanId;
  date: string;
  statut: "success" | "pending";
  reference: string;
}

// ─────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────

const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR") + " FCFA";
const generateRef = () => `EPG-${Date.now().toString().slice(-8)}`;

const dateDeblocage = (mois: number | null): string => {
  if (!mois) return "Disponible maintenant";
  const d = new Date();
  d.setMonth(d.getMonth() + mois);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
};

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: "1", type: "depot",   montant: 25000, penalite: 0,    montant_net: 25000, plan: "6mois", date: "2025-03-15 10:30", statut: "success", reference: "EPG-20250001" },
  { id: "2", type: "depot",   montant: 50000, penalite: 0,    montant_net: 50000, plan: "1an",   date: "2025-03-10 14:00", statut: "success", reference: "EPG-20250002" },
  { id: "3", type: "retrait", montant: 10000, penalite: 1000, montant_net: 9000,  plan: "libre", date: "2025-03-08 09:15", statut: "success", reference: "EPG-20250003" },
];

// ─────────────────────────────────────────────
// MODAL CONTRAT
// ─────────────────────────────────────────────

function ModalContrat({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-card rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-black tracking-widest opacity-70 uppercase">Avant de commencer</p>
              <h2 className="text-xl font-black">Contrat d'Épargne NEXORA</h2>
            </div>
          </div>
        </div>

        {/* Corps scrollable */}
        <div
          className="flex-1 overflow-y-auto p-6 space-y-5 text-sm text-muted-foreground"
          onScroll={e => {
            const el = e.currentTarget;
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) setScrolled(true);
          }}
        >
          <p className="text-foreground font-semibold">
            Bienvenue dans l'espace Épargne <span className="text-emerald-600">NEXORA</span>.
          </p>
          <p>En accédant à cette fonctionnalité, vous choisissez de faire un pas vers une meilleure gestion de vos finances personnelles.</p>

          <div className="space-y-2">
            <p className="font-black text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-base">📌</span>
              Engagement de l'utilisateur
            </p>
            <p>En utilisant le service d'épargne NEXORA, vous acceptez de déposer volontairement des fonds dans votre espace sécurisé. Ces fonds restent votre propriété exclusive.</p>
            <ul className="space-y-1.5 ml-2">
              {["Développer une discipline financière", "Atteindre vos objectifs personnels", "Sécuriser vos économies"].map(item => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <p className="font-black text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-base">💰</span>
              Plans d'épargne disponibles
            </p>
            <div className="space-y-2">
              {PLANS.map(p => (
                <div key={p.id} className="flex items-start gap-3 p-3 bg-muted/60 rounded-xl">
                  <span className="text-xl">{p.icon}</span>
                  <div>
                    <p className="font-bold text-foreground text-sm">{p.label} — <span className="text-muted-foreground font-normal">{p.dureeLabel}</span></p>
                    <p className="text-xs">{p.description}{p.penalite > 0 ? ` Pénalité de retrait anticipé : ${p.penalite}%.` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl space-y-2">
            <p className="font-black text-destructive text-xs uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Pénalité de retrait anticipé
            </p>
            <p>Pour les plans <strong>bloqués (6 mois, 1 an, 2 ans, 3 ans)</strong>, aucun retrait n'est possible avant la date d'échéance. Le plan <strong>Épargne Libre</strong> permet un retrait à tout moment avec une pénalité de <strong>10%</strong>.</p>
          </div>

          <div className="space-y-2">
            <p className="font-black text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-yellow-100 text-yellow-700 flex items-center justify-center text-base">🔒</span>
              Sécurité et responsabilité
            </p>
            <p>NEXORA met en œuvre des mesures de sécurité avancées pour protéger vos fonds. En utilisant ce service, vous êtes responsable de vos décisions financières.</p>
          </div>

          <div className="p-4 bg-muted rounded-2xl text-xs text-muted-foreground">
            Ce service est fourni à titre d'outil de discipline financière personnelle. NEXORA n'est pas un établissement bancaire agréé. Les fonds déposés sont gérés exclusivement dans le cadre de la plateforme.
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border flex-shrink-0 space-y-4 bg-card">
          {!scrolled && (
            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
              <ChevronDown className="w-3.5 h-3.5 animate-bounce" /> Faites défiler pour lire entièrement
            </p>
          )}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-border accent-emerald-500 flex-shrink-0" />
            <span className="text-sm font-semibold text-foreground leading-relaxed">
              J'ai lu et j'accepte les conditions du contrat d'épargne NEXORA. Je m'engage à respecter les règles de chaque plan choisi.
            </span>
          </label>
          <button
            onClick={onAccept}
            disabled={!checked}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200">
            <BadgeCheck className="w-5 h-5" /> Accepter et accéder à l'épargne
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL RETRAIT
// ─────────────────────────────────────────────

function ModalRetrait({
  solde, onClose, onConfirm
}: {
  solde: number;
  onClose: () => void;
  onConfirm: (data: { montant: number; nom: string; pays: string; reseau: string; numero: string }) => void;
}) {
  const [montant, setMontant] = useState("");
  const [nom, setNom]         = useState("");
  const [pays, setPays]       = useState("Bénin");
  const [reseau, setReseau]   = useState(PAYS_RESEAUX["Bénin"][0]);
  const [numero, setNumero]   = useState("");
  const [loading, setLoading] = useState(false);

  const montantNum = parseFloat(montant) || 0;
  const penalite   = Math.round(montantNum * 0.10);
  const netRecu    = montantNum - penalite;
  const valid      = montantNum >= 100 && montantNum <= solde && nom.trim().length >= 3 && numero.length >= 8;

  const handlePays = (p: string) => { setPays(p); setReseau(PAYS_RESEAUX[p]?.[0] || ""); };

  const handleSubmit = async () => {
    if (!valid) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 2000));
    setLoading(false);
    onConfirm({ montant: montantNum, nom, pays, reseau, numero });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl border border-border overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white flex items-center justify-between">
          <div>
            <p className="text-xs font-black tracking-widest opacity-70 uppercase">Récupérer mes fonds</p>
            <h3 className="text-xl font-black">Demande de retrait</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Solde dispo */}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/60 rounded-2xl">
            <span className="text-xs font-bold text-muted-foreground">Solde disponible</span>
            <span className="font-black text-foreground">{fmt(solde)}</span>
          </div>

          {/* Montant */}
          <div>
            <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5">Montant à retirer</label>
            <div className="relative">
              <input type="number" value={montant} onChange={e => setMontant(e.target.value)}
                placeholder="Minimum 100 FCFA"
                className="w-full px-4 py-3 pr-24 bg-muted/60 border-2 border-border focus:border-emerald-400 rounded-2xl text-lg font-black outline-none transition-colors" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">FCFA</span>
            </div>
            {montantNum >= 100 && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-amber-700">Pénalité (10%)</span>
                  <span className="font-bold text-amber-700">− {fmt(penalite)}</span>
                </div>
                <div className="flex justify-between border-t border-amber-200 pt-1">
                  <span className="font-black text-foreground">Vous recevrez</span>
                  <span className="font-black text-emerald-600">{fmt(netRecu)}</span>
                </div>
              </div>
            )}
            {montantNum > solde && (
              <p className="text-xs text-destructive font-semibold mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Solde insuffisant
              </p>
            )}
          </div>

          {/* Nom bénéficiaire */}
          <div>
            <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5">Nom & Prénom du bénéficiaire</label>
            <input type="text" value={nom} onChange={e => setNom(e.target.value)}
              placeholder="Jean Dupont"
              className="w-full px-4 py-3 bg-muted/60 border-2 border-border focus:border-emerald-400 rounded-2xl text-sm font-semibold outline-none transition-colors" />
          </div>

          {/* Pays */}
          <div>
            <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5">Pays</label>
            <select value={pays} onChange={e => handlePays(e.target.value)}
              className="w-full px-4 py-3 bg-muted/60 border-2 border-border focus:border-emerald-400 rounded-2xl text-sm font-semibold outline-none transition-colors">
              {PAYS_LIST.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Réseau */}
          <div>
            <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5">Réseau Mobile Money</label>
            <div className="grid grid-cols-2 gap-2">
              {(PAYS_RESEAUX[pays] || []).map(r => (
                <button key={r} type="button" onClick={() => setReseau(r)}
                  className={`py-3 px-3 rounded-2xl text-sm font-black border-2 transition-all ${
                    reseau === r
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                      : "border-border bg-muted/60 text-foreground hover:border-emerald-200"
                  }`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Numéro */}
          <div>
            <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5">Numéro Mobile Money</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="tel" value={numero} onChange={e => setNumero(e.target.value)}
                placeholder="+229 97 00 00 00"
                className="w-full pl-11 pr-4 py-3 bg-muted/60 border-2 border-border focus:border-emerald-400 rounded-2xl text-sm font-semibold outline-none transition-colors" />
            </div>
          </div>

          {/* Info pénalité */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-2xl">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Ce retrait est depuis un plan <strong>Épargne Libre</strong>. Une pénalité de <strong>10%</strong> sera appliquée. Pour les plans bloqués, le retrait n'est possible qu'à l'échéance.
            </p>
          </div>

          <button onClick={handleSubmit} disabled={!valid || loading}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Traitement...</>
              : <><ArrowDownLeft className="w-4 h-4" /> Valider le retrait {montantNum >= 100 ? `— ${fmt(montantNum)}` : ""}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────

const CONTRAT_KEY = "nexora_epargne_contrat_accepte";

export default function EpargneNexoraPage() {
  const user         = getNexoraUser();
  const { toast }    = useToast();

  const [contratAccepte, setContratAccepte] = useState(() => localStorage.getItem(CONTRAT_KEY) === "true");
  const [activeTab, setActiveTab]           = useState<TabType>("apercu");
  const [planChoisi, setPlanChoisi]         = useState<PlanId>("libre");
  const [montantDepot, setMontantDepot]     = useState("");
  const [loadingDepot, setLoadingDepot]     = useState(false);
  const [showRetrait, setShowRetrait]       = useState(false);
  const [transactions, setTransactions]     = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [successMsg, setSuccessMsg]         = useState<string | null>(null);

  // Calculs
  const totalDepose  = transactions.filter(t => t.type === "depot"   && t.statut === "success").reduce((s, t) => s + t.montant, 0);
  const totalRetire  = transactions.filter(t => t.type === "retrait" && t.statut === "success").reduce((s, t) => s + t.montant, 0);
  const solde        = Math.max(0, totalDepose - totalRetire);
  const soldeLibre   = transactions.filter(t => t.plan === "libre" && t.type === "depot" && t.statut === "success").reduce((s, t) => s + t.montant, 0)
                     - transactions.filter(t => t.plan === "libre" && t.type === "retrait" && t.statut === "success").reduce((s, t) => s + t.montant, 0);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 4000); };

  const handleAcceptContrat = () => {
    localStorage.setItem(CONTRAT_KEY, "true");
    setContratAccepte(true);
  };

  const handleDepot = async () => {
    const montantNum = parseFloat(montantDepot) || 0;
    if (montantNum < 300) {
      toast({ title: "Minimum 300 FCFA", variant: "destructive" }); return;
    }
    setLoadingDepot(true);
    await new Promise(r => setTimeout(r, 1800));
    const plan = PLANS.find(p => p.id === planChoisi)!;
    const tx: Transaction = {
      id: Date.now().toString(), type: "depot", montant: montantNum,
      penalite: 0, montant_net: montantNum, plan: planChoisi,
      date: new Date().toLocaleString("fr-FR"), statut: "success",
      reference: generateRef(),
    };
    setTransactions(prev => [tx, ...prev]);
    setMontantDepot("");
    setLoadingDepot(false);
    showSuccess(`✅ ${fmt(montantNum)} déposés dans le plan ${plan.label} !`);
    setActiveTab("apercu");
  };

  const handleRetrait = (data: { montant: number; nom: string; pays: string; reseau: string; numero: string }) => {
    const penalite   = Math.round(data.montant * 0.10);
    const montantNet = data.montant - penalite;
    const tx: Transaction = {
      id: Date.now().toString(), type: "retrait", montant: data.montant,
      penalite, montant_net: montantNet, plan: "libre",
      date: new Date().toLocaleString("fr-FR"), statut: "success",
      reference: generateRef(),
    };
    setTransactions(prev => [tx, ...prev]);
    setShowRetrait(false);
    showSuccess(`✅ Retrait de ${fmt(data.montant)} effectué — ${fmt(montantNet)} envoyés sur ${data.reseau}`);
  };

  const TABS: { id: TabType; label: string; icon: any }[] = [
    { id: "apercu",     label: "Aperçu",     icon: TrendingUp  },
    { id: "depot",      label: "Déposer",    icon: ArrowUpRight },
    { id: "retrait",    label: "Retirer",    icon: ArrowDownLeft },
    { id: "historique", label: "Historique", icon: History     },
  ];

  return (
    <AppLayout>
      {/* Contrat */}
      {!contratAccepte && <ModalContrat onAccept={handleAcceptContrat} />}

      {/* Toast */}
      {successMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-emerald-500 text-white rounded-2xl shadow-xl font-semibold text-sm flex items-center gap-2 max-w-sm">
          {successMsg}
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-5 pb-10">

        {/* ── HERO SOLDE ── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-white/10 -translate-y-1/3 translate-x-1/3 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-teal-300/20 translate-y-1/3 -translate-x-1/3 blur-2xl pointer-events-none" />

          <div className="relative">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-black tracking-[4px] opacity-50 uppercase">Nexora</p>
                <h1 className="text-xl font-black tracking-wide flex items-center gap-2">
                  <PiggyBank className="w-6 h-6" /> Épargne
                </h1>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-200" />
              </div>
            </div>

            <div className="mb-5">
              <p className="text-xs text-white/50 font-bold uppercase tracking-widest mb-1">Solde total épargné</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black tracking-tight">{Math.round(solde).toLocaleString("fr-FR")}</span>
                <span className="text-xl font-bold text-white/50 mb-1">FCFA</span>
              </div>
            </div>

            {/* Stats mini */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="bg-white/10 rounded-2xl p-3 text-center">
                <p className="text-[10px] text-white/50 font-bold">Déposé</p>
                <p className="text-sm font-black">{Math.round(totalDepose).toLocaleString()}</p>
                <p className="text-[10px] text-white/40">FCFA</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-3 text-center">
                <p className="text-[10px] text-white/50 font-bold">Retiré</p>
                <p className="text-sm font-black">{Math.round(totalRetire).toLocaleString()}</p>
                <p className="text-[10px] text-white/40">FCFA</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-3 text-center">
                <p className="text-[10px] text-white/50 font-bold">Plans actifs</p>
                <p className="text-sm font-black">{[...new Set(transactions.filter(t => t.type === "depot").map(t => t.plan))].length}</p>
                <p className="text-[10px] text-white/40">plans</p>
              </div>
            </div>

            {/* Boutons */}
            <div className="flex gap-3">
              <button onClick={() => setActiveTab("depot")}
                className="flex-1 py-3.5 bg-white text-emerald-700 font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all hover:scale-105 active:scale-95 shadow-lg">
                <ArrowUpRight className="w-5 h-5" /> Déposer
              </button>
              <button onClick={() => Math.max(0, soldeLibre) >= 100 ? setShowRetrait(true) : toast({ title: "Solde libre insuffisant (min. 100 FCFA)", variant: "destructive" })}
                className="flex-1 py-3.5 bg-white/15 border border-white/25 text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-white/25 transition-all hover:scale-105 active:scale-95">
                <ArrowDownLeft className="w-5 h-5" /> Retirer
              </button>
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all flex-shrink-0 ${
                activeTab === tab.id
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200"
                  : "bg-card border border-border text-muted-foreground hover:border-emerald-300 hover:text-emerald-600"
              }`}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════
            TAB : APERÇU
        ══════════════════════════ */}
        {activeTab === "apercu" && (
          <div className="space-y-4">
            <h3 className="font-black text-sm text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" /> Vos plans d'épargne
            </h3>
            <div className="space-y-3">
              {PLANS.map(plan => {
                const depotsPlan = transactions.filter(t => t.plan === plan.id && t.type === "depot" && t.statut === "success");
                const soldePlan  = depotsPlan.reduce((s, t) => s + t.montant, 0)
                                 - transactions.filter(t => t.plan === plan.id && t.type === "retrait" && t.statut === "success").reduce((s, t) => s + t.montant, 0);
                const actif      = soldePlan > 0;

                return (
                  <div key={plan.id} className={`bg-card border-2 rounded-3xl p-4 transition-all ${actif ? "border-emerald-200 shadow-sm" : "border-border opacity-60"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${plan.couleur} flex items-center justify-center text-xl shadow-sm`}>
                          {plan.icon}
                        </div>
                        <div>
                          <p className="font-black text-sm text-foreground">{plan.label}</p>
                          <p className="text-xs text-muted-foreground">{plan.dureeLabel}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-lg text-foreground">{Math.round(soldePlan).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">FCFA</p>
                      </div>
                    </div>
                    {plan.duree && actif && (
                      <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-muted/60 rounded-xl">
                        <CalendarClock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          Disponible le <strong className="text-foreground">{dateDeblocage(plan.duree)}</strong>
                        </p>
                      </div>
                    )}
                    {plan.penalite > 0 && actif && (
                      <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <p className="text-xs text-amber-700">Pénalité de retrait : <strong>{plan.penalite}%</strong></p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════
            TAB : DÉPÔT
        ══════════════════════════ */}
        {activeTab === "depot" && (
          <div className="space-y-5">
            <div className="bg-card border border-border rounded-3xl p-5 space-y-4">
              <h3 className="font-black text-foreground flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-emerald-500" /> Déposer de l'épargne
              </h3>

              {/* Montant */}
              <div>
                <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5">Montant à épargner</label>
                <div className="relative">
                  <input type="number" value={montantDepot} onChange={e => setMontantDepot(e.target.value)}
                    placeholder="Minimum 300 FCFA"
                    className="w-full px-4 py-3.5 pr-24 bg-muted/60 border-2 border-border focus:border-emerald-400 rounded-2xl text-xl font-black outline-none transition-colors" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">FCFA</span>
                </div>
                <div className="flex gap-2 mt-2">
                  {[1000, 5000, 10000, 25000].map(v => (
                    <button key={v} type="button" onClick={() => setMontantDepot(String(v))}
                      className="flex-1 py-1.5 text-xs font-black rounded-xl bg-muted hover:bg-emerald-50 hover:text-emerald-700 transition-colors border border-border">
                      {v / 1000}k
                    </button>
                  ))}
                </div>
              </div>

              {/* Choix plan */}
              <div>
                <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider mb-2">Choisir un plan d'épargne</label>
                <div className="space-y-2">
                  {PLANS.map(plan => (
                    <button key={plan.id} type="button" onClick={() => setPlanChoisi(plan.id as PlanId)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${
                        planChoisi === plan.id
                          ? "border-emerald-400 bg-emerald-50"
                          : "border-border bg-muted/40 hover:border-emerald-200"
                      }`}>
                      <span className="text-2xl">{plan.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-foreground">{plan.label}</span>
                          {plan.penalite > 0 && (
                            <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold">−{plan.penalite}% si retrait</span>
                          )}
                          {plan.duree && (
                            <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-bold flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> {plan.dureeLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                        {plan.duree && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <CalendarClock className="w-3 h-3" />
                            Disponible le {dateDeblocage(plan.duree)}
                          </p>
                        )}
                      </div>
                      {planChoisi === plan.id && (
                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleDepot} disabled={loadingDepot || (parseFloat(montantDepot) || 0) < 300}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100">
                {loadingDepot
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Traitement...</>
                  : <><Banknote className="w-4 h-4" /> Confirmer le dépôt {(parseFloat(montantDepot) || 0) >= 300 ? `— ${fmt(parseFloat(montantDepot))}` : ""}</>}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════
            TAB : RETRAIT
        ══════════════════════════ */}
        {activeTab === "retrait" && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-3xl p-5 space-y-4">
              <h3 className="font-black text-foreground flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-amber-500" /> Retrait d'épargne
              </h3>

              {/* Soldes par plan */}
              <div className="space-y-2">
                {PLANS.map(plan => {
                  const soldePlan = transactions.filter(t => t.plan === plan.id && t.type === "depot" && t.statut === "success").reduce((s, t) => s + t.montant, 0)
                                  - transactions.filter(t => t.plan === plan.id && t.type === "retrait" && t.statut === "success").reduce((s, t) => s + t.montant, 0);
                  const estBloque = !!plan.duree;
                  const estVide   = soldePlan <= 0;

                  return (
                    <div key={plan.id} className={`flex items-center justify-between p-4 rounded-2xl border ${estVide ? "border-border bg-muted/30 opacity-50" : estBloque ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{plan.icon}</span>
                        <div>
                          <p className="font-black text-sm text-foreground">{plan.label}</p>
                          <p className="text-xs text-muted-foreground">{fmt(Math.max(0, soldePlan))}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {estVide ? (
                          <span className="text-xs text-muted-foreground font-semibold">Vide</span>
                        ) : estBloque ? (
                          <div className="flex items-center gap-1 text-amber-600 text-xs font-black">
                            <Lock className="w-3.5 h-3.5" /> Bloqué
                          </div>
                        ) : (
                          <button onClick={() => setShowRetrait(true)}
                            className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-black rounded-xl hover:bg-emerald-600 transition-colors">
                            Retirer
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-start gap-3 p-4 bg-muted/60 rounded-2xl">
                <ShieldCheck className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Seuls les fonds du plan <strong>Épargne Libre</strong> sont disponibles au retrait immédiat (avec 10% de pénalité). Les plans bloqués ne peuvent être retirés qu'à leur date d'échéance.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════
            TAB : HISTORIQUE
        ══════════════════════════ */}
        {activeTab === "historique" && (
          <div className="space-y-3">
            <p className="text-xs font-black text-muted-foreground uppercase tracking-wider">{transactions.length} transaction{transactions.length > 1 ? "s" : ""}</p>

            {transactions.length === 0 ? (
              <div className="text-center py-14 bg-card border border-border rounded-3xl">
                <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-bold">Aucune transaction</p>
              </div>
            ) : (
              transactions.map(tx => {
                const plan = PLANS.find(p => p.id === tx.plan);
                return (
                  <div key={tx.id} className="bg-card border border-border rounded-3xl p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${tx.type === "depot" ? "bg-emerald-100" : "bg-amber-100"}`}>
                        {tx.type === "depot"
                          ? <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                          : <ArrowDownLeft className="w-5 h-5 text-amber-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-foreground">
                            {tx.type === "depot" ? "Dépôt" : "Retrait"}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${plan?.badge}`}>
                            {plan?.icon} {plan?.label}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${tx.statut === "success" ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {tx.statut === "success" ? "✓ Réussi" : "⏳ En cours"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">{tx.reference} · {tx.date}</p>
                        {tx.penalite > 0 && (
                          <p className="text-xs text-amber-600 font-semibold mt-0.5">Pénalité : −{fmt(tx.penalite)}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`font-black text-base ${tx.type === "depot" ? "text-emerald-600" : "text-amber-600"}`}>
                          {tx.type === "depot" ? "+" : "−"}{fmt(tx.montant)}
                        </p>
                        {tx.penalite > 0 && (
                          <p className="text-xs text-muted-foreground">net: {fmt(tx.montant_net)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>

      {/* Modal retrait */}
      {showRetrait && (
        <ModalRetrait
          solde={Math.max(0, soldeLibre)}
          onClose={() => setShowRetrait(false)}
          onConfirm={handleRetrait}
        />
      )}
    </AppLayout>
  );
}
