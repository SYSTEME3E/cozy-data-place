import { useState, useEffect, useCallback, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import {
  Send, Plus, History, Globe,
  ArrowDownLeft, ArrowUpRight, X, Check, AlertCircle,
  Download, Phone, Search, ChevronDown, Loader2,
  BadgeCheck, RefreshCw, User, MapPin,
  Copy, Users, Zap, Shield, QrCode,
  ChevronRight, Calendar, CreditCard, Hash, Tag, FileText,
  CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown,
  Wallet, MoreHorizontal
} from "lucide-react";
import { initPayment, initPayout } from "@/lib/Moneroo";
import { getNexoraUser } from "@/lib/nexora-auth";
import { supabase } from "@/integrations/supabase/client";
import PinTransferModal from "@/components/PinTransferModal";
import { useDevise, DEVISES_LISTE } from "@/lib/devise-context";

const LOGO_URL = "https://i.postimg.cc/c1QgbZsG/ei_1773937801458_removebg_preview.png";

const ACTIVE_COUNTRIES = [
  { code: "BJ", flag: "🇧🇯", name: "Bénin",         currency: "XOF", networks: ["MTN MoMo", "Moov Money"] },
  { code: "CI", flag: "🇨🇮", name: "Côte d'Ivoire", currency: "XOF", networks: ["Orange Money", "MTN MoMo", "Wave", "Moov Money"] },
  { code: "TG", flag: "🇹🇬", name: "Togo",           currency: "XOF", networks: ["Flooz", "T-Money"] },
  { code: "SN", flag: "🇸🇳", name: "Sénégal",        currency: "XOF", networks: ["Orange Money", "Wave", "Free Money"] },
  { code: "NE", flag: "🇳🇪", name: "Niger",          currency: "XOF", networks: ["Airtel Money", "Moov Money"] },
  { code: "ML", flag: "🇲🇱", name: "Mali",           currency: "XOF", networks: ["Orange Money", "Moov Money", "Wave"] },
  { code: "BF", flag: "🇧🇫", name: "Burkina Faso",   currency: "XOF", networks: ["Orange Money", "Moov Money"] },
  { code: "GN", flag: "🇬🇳", name: "Guinée",         currency: "GNF", networks: ["Orange Money", "MTN MoMo"] },
  { code: "CM", flag: "🇨🇲", name: "Cameroun",       currency: "XAF", networks: ["MTN MoMo", "Orange Money"] },
  { code: "CD", flag: "🇨🇩", name: "RD Congo",       currency: "CDF", networks: ["Vodacom", "Airtel Money"] },
  { code: "GA", flag: "🇬🇦", name: "Gabon",          currency: "XAF", networks: ["Airtel Money", "MTN MoMo"] },
  { code: "CG", flag: "🇨🇬", name: "Congo",          currency: "XAF", networks: ["MTN MoMo", "Airtel Money"] },
  { code: "GH", flag: "🇬🇭", name: "Ghana",          currency: "GHS", networks: ["MTN MoMo", "Vodafone Cash", "AirtelTigo Money"] },
  { code: "NG", flag: "🇳🇬", name: "Nigéria",        currency: "NGN", networks: ["MTN MoMo", "Airtel Money", "Glo Pay"] },
  { code: "KE", flag: "🇰🇪", name: "Kenya",          currency: "KES", networks: ["M-Pesa", "Airtel Money"] },
  { code: "TZ", flag: "🇹🇿", name: "Tanzanie",       currency: "TZS", networks: ["M-Pesa", "Tigo Pesa", "Airtel Money"] },
  { code: "UG", flag: "🇺🇬", name: "Ouganda",        currency: "UGX", networks: ["MTN MoMo", "Airtel Money"] },
  { code: "RW", flag: "🇷🇼", name: "Rwanda",         currency: "RWF", networks: ["MTN MoMo", "Airtel Money"] },
  { code: "MA", flag: "🇲🇦", name: "Maroc",          currency: "MAD", networks: ["Orange Money", "Maroc Telecom"] },
  { code: "GM", flag: "🇬🇲", name: "Gambie",         currency: "GMD", networks: ["Africell Money", "QCell"] },
  { code: "SL", flag: "🇸🇱", name: "Sierra Leone",   currency: "SLL", networks: ["Orange Money", "Africell Money"] },
  { code: "LR", flag: "🇱🇷", name: "Liberia",        currency: "LRD", networks: ["MTN MoMo", "Lonestar Money"] },
  { code: "MZ", flag: "🇲🇿", name: "Mozambique",     currency: "MZN", networks: ["M-Pesa", "Airtel Money"] },
  { code: "ZM", flag: "🇿🇲", name: "Zambie",         currency: "ZMW", networks: ["MTN MoMo", "Airtel Money"] },
];

type ActiveCountry = typeof ACTIVE_COUNTRIES[0];
type Transaction = {
  id: string;
  type: "depot" | "transfert" | "interne_envoi" | "interne_recu";
  montant: number;
  frais: number;
  date: string;
  rawDate: string;
  pays?: string;
  flag?: string;
  reseau?: string;
  telephone?: string;
  nom_beneficiaire?: string;
  status: "success" | "pending" | "failed" | "annulé" | "expiré";
  reference: string;
  checkout_url?: string;
};

const fmtNum = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));
const calcFrais = (montant: number) => Math.round(montant * 0.03);
const generateRef = (type: "DEP" | "TRF") => `${type}-${Date.now().toString().slice(-8)}`;

function getDevisePersistee(): string {
  try { return localStorage.getItem("nexora-devise") || "XOF"; } catch { return "XOF"; }
}

function getSymboleDevise(code: string): string {
  return DEVISES_LISTE.find(d => d.code === code)?.symbole ?? code;
}

const PENDING_RECHARGE_KEY = "nexora-pending-recharge";
type PendingRechargeData = {
  payment_url: string; montant: number; total: number; email: string; timestamp: number;
};
function savePendingRecharge(data: PendingRechargeData) {
  try { localStorage.setItem(PENDING_RECHARGE_KEY, JSON.stringify(data)); } catch {}
}
function loadPendingRecharge(): PendingRechargeData | null {
  try { const raw = localStorage.getItem(PENDING_RECHARGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function clearPendingRecharge() {
  try { localStorage.removeItem(PENDING_RECHARGE_KEY); } catch {}
}

function mapSupabaseRow(row: any): Transaction {
  const meta = typeof row.metadata === "string" ? JSON.parse(row.metadata) : (row.metadata ?? {});
  const isRecharge = row.type === "recharge_transfert";
  const frais = row.frais ?? 0;
  const montant = isRecharge ? Math.max(0, (row.amount ?? 0) - frais) : (row.amount ?? 0);
  let status: Transaction["status"];
  if (row.status === "completed")  status = "success";
  else if (row.status === "pending")   status = "pending";
  else if (row.status === "cancelled") status = "annulé";
  else if (row.status === "expired")   status = "expiré";
  else status = "failed";
  return {
    id: row.id, type: isRecharge ? "depot" : "transfert", montant, frais,
    date: row.created_at ? new Date(row.created_at).toLocaleString("fr-FR") : "—",
    rawDate: row.created_at ?? new Date(0).toISOString(),
    pays: meta.pays ?? undefined, flag: meta.pays_flag ?? undefined,
    reseau: meta.reseau ?? undefined, telephone: meta.telephone ?? undefined,
    nom_beneficiaire: meta.nom_beneficiaire ?? undefined, status,
    reference: row.moneroo_id ?? row.id?.slice(0, 8).toUpperCase() ?? "—",
    checkout_url: row.checkout_url ?? undefined,
  };
}

// ─── Country Selector ───────────────────────────────────────────────────────
function CountrySelector({ selected, onSelect, label }: {
  selected: ActiveCountry | null; onSelect: (c: ActiveCountry) => void; label: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = ACTIVE_COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.networks.some(n => n.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/50 border border-border/60 rounded-xl hover:border-border transition-colors text-left">
        {selected ? (
          <>
            <span className="text-xl">{selected.flag}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground">{selected.name}</p>
              <p className="text-xs text-muted-foreground truncate">{selected.networks.join(" · ")}</p>
            </div>
          </>
        ) : (
          <span className="text-muted-foreground text-sm">Sélectionner un pays...</span>
        )}
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-xl z-10 relative">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Pays ou réseau..."
                className="w-full pl-8 pr-3 py-2 bg-muted rounded-lg text-sm outline-none" autoFocus />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0
              ? <p className="p-4 text-sm text-muted-foreground text-center">Aucun résultat</p>
              : filtered.map(c => (
                <button key={c.code} onClick={() => { onSelect(c); setOpen(false); setSearch(""); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/70 transition-colors text-left">
                  <span className="text-xl">{c.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.networks.join(" · ")}</p>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{c.currency}</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal Recharge ─────────────────────────────────────────────────────────
function ModalRecharge({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { fmtXOF, rates, devise } = useDevise();
  const deviseLocale = devise;
  const symboleLocal = getSymboleDevise(deviseLocale);
  const isXof = deviseLocale === "XOF" || deviseLocale === "XAF";
  const tauxLocParXof = rates[deviseLocale] ?? 1;
  const tauxXofParLoc = tauxLocParXof > 0 ? 1 / tauxLocParXof : 1;

  const [montant, setMontant] = useState("");
  const [email, setEmail] = useState(getNexoraUser()?.email ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const montantLocalNum = parseFloat(montant) || 0;
  const montantFcfa = isXof ? montantLocalNum : Math.round(montantLocalNum * tauxXofParLoc);
  const fraisFixe = 100;
  const totalPaye = montantFcfa + fraisFixe;
  const quickValues = isXof ? [5000, 10000, 25000, 50000] : [5000, 10000, 25000, 50000].map(v => Math.round(v * tauxLocParXof));
  const valid = montantFcfa >= 200 && email.includes("@");

  const handleSubmit = async () => {
    if (!valid) return;
    setError(null); setLoading(true);
    try {
      const result = await initPayment({ type: "recharge_transfert", amount: montantFcfa, metadata: { email } });
      if (!result.success || !result.payment_url) { setError(result.error ?? "Erreur lors de l'initialisation."); setLoading(false); return; }
      savePendingRecharge({ payment_url: result.payment_url, montant: montantFcfa, total: totalPaye, email, timestamp: Date.now() });
      const opened = window.open(result.payment_url, "_blank", "noopener,noreferrer");
      if (!opened) { setPaymentUrl(result.payment_url); } else { onSuccess(); onClose(); }
    } catch (err: any) { setError(err.message ?? "Erreur réseau."); setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-border/30">

        {/* Header */}
        <div className="shrink-0 bg-gradient-to-br from-amber-500 to-orange-500 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <ArrowDownLeft className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-black text-white text-base">Recharger</h2>
                <p className="text-amber-100 text-xs">Paiement sécurisé · {symboleLocal}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {!isXof && (
            <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-600 font-semibold">
              <Globe className="w-3.5 h-3.5 shrink-0" />
              1 {deviseLocale} ≈ {Math.round(tauxXofParLoc)} FCFA
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Montant ({symboleLocal})</label>
            <input type="number" value={montant} onChange={e => setMontant(e.target.value)}
              placeholder="10 000"
              className="w-full px-4 py-4 bg-muted/50 border border-border/60 rounded-xl text-2xl font-black outline-none focus:border-amber-400 transition-colors" />
            <div className="grid grid-cols-4 gap-1.5">
              {quickValues.map(v => (
                <button key={v} onClick={() => setMontant(String(v))}
                  className="py-2 text-xs font-bold rounded-lg bg-muted hover:bg-amber-500/10 hover:text-amber-600 border border-border/40 hover:border-amber-300 transition-all">
                  {fmtNum(v)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email de confirmation</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="w-full px-4 py-3 bg-muted/50 border border-border/60 rounded-xl outline-none focus:border-amber-400 transition-colors text-sm" />
          </div>

          {montantFcfa >= 200 && (
            <div className="bg-muted/40 border border-border/40 rounded-xl p-4 space-y-2.5">
              {!isXof && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Montant saisi</span>
                  <span className="font-bold">{fmtNum(montantLocalNum)} {symboleLocal}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Montant crédité</span>
                <span className="font-bold text-amber-600">{fmtNum(montantFcfa)} FCFA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frais fixe</span>
                <span className="text-muted-foreground">+ {fmtNum(fraisFixe)} FCFA</span>
              </div>
              <div className="h-px bg-border/60" />
              <div className="flex justify-between">
                <span className="font-black text-foreground">Total débité</span>
                <span className="font-black text-foreground">{fmtNum(totalPaye)} FCFA</span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><p>{error}</p>
            </div>
          )}

          {paymentUrl && (
            <a href={paymentUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-amber-400 text-black font-black rounded-xl hover:bg-amber-300 transition-colors">
              Ouvrir la page de paiement
            </a>
          )}

          <button onClick={handleSubmit} disabled={!valid || loading}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:pointer-events-none text-white font-black rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Préparation...</> : <>Recharger {montantFcfa > 0 ? `· ${fmtNum(totalPaye)} FCFA` : ""}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Transfert International ──────────────────────────────────────────
function ModalTransfert({ onClose, onConfirm, balance }: {
  onClose: () => void;
  onConfirm: (montantFcfa: number, frais: number, reseau: string, tel: string, pays: ActiveCountry, nomComplet: string) => void;
  balance: number;
}) {
  const { fmtXOF, xofTo, rates, devise } = useDevise();
  const deviseLocale = devise;
  const symboleLocal = getSymboleDevise(deviseLocale);
  const isXof = deviseLocale === "XOF" || deviseLocale === "XAF";
  const tauxLocParXof = rates[deviseLocale] ?? 1;
  const tauxXofParLoc = tauxLocParXof > 0 ? 1 / tauxLocParXof : 1;
  const soldeLocal = isXof ? balance : balance * tauxLocParXof;

  const [nomComplet, setNomComplet] = useState("");
  const [montant, setMontant] = useState("");
  const [pays, setPays] = useState<ActiveCountry | null>(null);
  const [reseau, setReseau] = useState("");
  const [telephone, setTelephone] = useState("");

  const montantLocalNum = parseFloat(montant) || 0;
  const montantFcfa = isXof ? montantLocalNum : Math.round(montantLocalNum * tauxXofParLoc);
  const frais = calcFrais(montantFcfa);
  const netRecu = montantFcfa - frais;
  const soldeInsuffisant = montantLocalNum > soldeLocal;
  const valid = montantFcfa >= 200 && !soldeInsuffisant && pays !== null && reseau !== "" && telephone.length >= 8 && nomComplet.trim().length >= 3;

  const deviseDestinataire = pays?.currency ?? "XOF";
  const memeDevise = deviseDestinataire === "XOF" || deviseDestinataire === "XAF";
  const montantConverti = netRecu > 0 ? xofTo(netRecu, deviseDestinataire) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-border/30">

        <div className="shrink-0 bg-gradient-to-br from-red-500 to-rose-600 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-black text-white text-base">Envoyer</h2>
                <p className="text-red-100 text-xs">3% de frais · 24 pays</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          {/* Solde dans le header */}
          <div className="mt-4 flex items-center justify-between px-3 py-2.5 bg-white/10 rounded-xl">
            <span className="text-red-100 text-xs font-semibold">Solde disponible</span>
            <span className="text-white font-black">{fmtXOF(balance)}</span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {!isXof && (
            <div className="flex items-center gap-2 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-600 font-semibold">
              <Globe className="w-3.5 h-3.5" /> 1 {deviseLocale} ≈ {Math.round(tauxXofParLoc)} FCFA
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nom du destinataire</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={nomComplet} onChange={e => setNomComplet(e.target.value)}
                placeholder="Prénom Nom"
                className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border/60 rounded-xl outline-none focus:border-red-400 transition-colors text-sm" />
            </div>
          </div>

          <CountrySelector selected={pays} onSelect={p => { setPays(p); setReseau(p.networks[0]); }} label="Pays de destination" />

          {pays && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Réseau</label>
              <div className="grid grid-cols-2 gap-2">
                {pays.networks.map(n => (
                  <button key={n} onClick={() => setReseau(n)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${reseau === n ? "border-red-400 bg-red-500/10 text-red-500" : "border-border/60 bg-muted/50 text-foreground hover:border-red-300"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Numéro Mobile Money</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)}
                placeholder="+229 97 00 00 00"
                className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border/60 rounded-xl outline-none focus:border-red-400 transition-colors text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Montant ({symboleLocal})</label>
            <input type="number" value={montant} onChange={e => setMontant(e.target.value)}
              placeholder="10 000"
              className={`w-full px-4 py-4 bg-muted/50 border rounded-xl text-2xl font-black outline-none transition-colors ${soldeInsuffisant ? "border-destructive" : "border-border/60 focus:border-red-400"}`} />
            {montantFcfa > 0 && (
              <div className="bg-muted/40 border border-border/40 rounded-xl p-3.5 space-y-2">
                {!isXof && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Équivalent FCFA</span><span className="font-bold">{fmtNum(montantFcfa)} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Frais (3%)</span><span>− {fmtNum(frais)} FCFA</span>
                </div>
                <div className="h-px bg-border/40" />
                <div className="flex justify-between text-sm font-black">
                  <span className="text-foreground">Reçoit</span>
                  <span className="text-emerald-500">
                    {memeDevise ? `${fmtNum(netRecu > 0 ? netRecu : 0)} ${deviseDestinataire}` : `≈ ${new Intl.NumberFormat("fr-FR").format(montantConverti)} ${deviseDestinataire}`}
                  </span>
                </div>
              </div>
            )}
            {soldeInsuffisant && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Solde insuffisant — disponible : {fmtXOF(balance)}
              </p>
            )}
          </div>

          <button onClick={() => { if (!valid || !pays) return; onConfirm(montantFcfa, frais, reseau, telephone, pays, nomComplet); }}
            disabled={!valid}
            className="w-full py-4 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:pointer-events-none text-white font-black rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-red-500/25">
            <Send className="w-4 h-4" />
            Envoyer {montantFcfa > 0 ? `· ${fmtNum(montantFcfa)} FCFA` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Transfert Interne ────────────────────────────────────────────────
function ModalTransfertInterne({ onClose, onSuccess, balance }: {
  onClose: () => void; onSuccess: () => void; balance: number;
}) {
  const { fmtXOF, rates, devise } = useDevise();
  const deviseLocale = devise;
  const symboleLocal = getSymboleDevise(deviseLocale);
  const isXof = deviseLocale === "XOF" || deviseLocale === "XAF";
  const tauxLocParXof = rates[deviseLocale] ?? 1;
  const tauxXofParLoc = tauxLocParXof > 0 ? 1 / tauxLocParXof : 1;
  const soldeLocal = isXof ? balance : balance * tauxLocParXof;

  const [nexoraId, setNexoraId] = useState("");
  const [montant, setMontant] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiverName, setReceiverName] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const montantLocalNum = parseFloat(montant) || 0;
  const montantFcfa = isXof ? montantLocalNum : Math.round(montantLocalNum * tauxXofParLoc);
  const valid = montantLocalNum >= 1 && montantLocalNum <= soldeLocal && receiverName !== null && nexoraId.trim().length >= 4;
  const quickValues = isXof ? [1000, 5000, 10000, 25000] : [1000, 5000, 10000, 25000].map(v => Math.round(v * tauxLocParXof));

  const lookupUser = async () => {
    if (!nexoraId.trim()) return;
    setLookingUp(true); setReceiverName(null); setError(null);
    const { data } = await supabase.from("nexora_users").select("nom_prenom, nexora_id").eq("nexora_id", nexoraId.trim().toUpperCase()).maybeSingle();
    setLookingUp(false);
    if (data) setReceiverName((data as any).nom_prenom);
    else setError("Aucun utilisateur trouvé avec cet ID.");
  };

  const handleSubmit = async () => {
    if (!valid) return;
    setLoading(true); setError(null);
    const user = getNexoraUser();
    if (!user?.id) { setError("Non connecté"); setLoading(false); return; }
    const { data: receiver } = await supabase.from("nexora_users").select("id, nom_prenom").eq("nexora_id", nexoraId.trim().toUpperCase()).maybeSingle();
    if (!receiver) { setError("Destinataire introuvable."); setLoading(false); return; }
    if ((receiver as any).id === user.id) { setError("Vous ne pouvez pas vous envoyer à vous-même."); setLoading(false); return; }
    const { error: deductErr } = await supabase.rpc("transfer_internal" as any, { p_sender_id: user.id, p_receiver_id: (receiver as any).id, p_amount: montantFcfa, p_note: note || null } as any);
    if (deductErr) {
      const { data: senderAccount } = await supabase.from("nexora_transfert_comptes").select("solde").eq("user_id", user.id).maybeSingle();
      const senderSolde = senderAccount?.solde ?? 0;
      if (senderSolde < montantFcfa) { setError("Solde insuffisant."); setLoading(false); return; }
      await supabase.from("nexora_transfert_comptes").update({ solde: senderSolde - montantFcfa, updated_at: new Date().toISOString() }).eq("user_id", user.id);
      const { data: recvAccount } = await supabase.from("nexora_transfert_comptes").select("solde").eq("user_id", (receiver as any).id).maybeSingle();
      if (recvAccount) await supabase.from("nexora_transfert_comptes").update({ solde: (recvAccount.solde ?? 0) + montantFcfa, updated_at: new Date().toISOString() }).eq("user_id", (receiver as any).id);
      else await supabase.from("nexora_transfert_comptes").insert({ user_id: (receiver as any).id, solde: montantFcfa });
      await supabase.from("internal_transfers").insert({ sender_id: user.id, receiver_id: (receiver as any).id, amount: montantFcfa, note: note || null });
    }
    setLoading(false); onSuccess(); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-border/30">

        <div className="shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-black text-white text-base">Transfert Nexora</h2>
                <p className="text-emerald-100 text-xs">Instantané · 0 FCFA de frais</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="mt-4 flex items-center justify-between px-3 py-2.5 bg-white/10 rounded-xl">
            <span className="text-emerald-100 text-xs font-semibold">Solde disponible</span>
            <span className="text-white font-black">{fmtXOF(balance)}</span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">ID Nexora du destinataire</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={nexoraId} onChange={e => { setNexoraId(e.target.value.toUpperCase()); setReceiverName(null); }}
                  placeholder="NX-XXXXXX"
                  className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border/60 rounded-xl outline-none focus:border-emerald-400 transition-colors font-mono text-sm uppercase" />
              </div>
              <button onClick={lookupUser} disabled={lookingUp || !nexoraId.trim()}
                className="px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors">
                {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>
            {receiverName && (
              <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-sm font-bold text-emerald-600">{receiverName}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Montant ({symboleLocal})</label>
            <input type="number" value={montant} onChange={e => setMontant(e.target.value)}
              placeholder="5 000"
              className="w-full px-4 py-4 bg-muted/50 border border-border/60 rounded-xl text-2xl font-black outline-none focus:border-emerald-400 transition-colors" />
            <div className="grid grid-cols-4 gap-1.5">
              {quickValues.map(v => (
                <button key={v} onClick={() => setMontant(String(v))}
                  className="py-2 text-xs font-bold rounded-lg bg-muted hover:bg-emerald-500/10 hover:text-emerald-600 border border-border/40 hover:border-emerald-300 transition-all">
                  {fmtNum(v)}
                </button>
              ))}
            </div>
            {!isXof && montantFcfa > 0 && (
              <p className="text-xs text-muted-foreground">≈ {fmtNum(montantFcfa)} FCFA envoyés</p>
            )}
            {montantLocalNum > soldeLocal && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Solde insuffisant
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Note (optionnel)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)}
              placeholder="Ex: Remboursement repas"
              className="w-full px-4 py-3 bg-muted/50 border border-border/60 rounded-xl outline-none focus:border-emerald-400 transition-colors text-sm" />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><p>{error}</p>
            </div>
          )}

          <button onClick={handleSubmit} disabled={!valid || loading}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:pointer-events-none text-white font-black rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</> : <><Zap className="w-4 h-4" /> Envoyer {montantLocalNum > 0 ? `· ${fmtNum(montantLocalNum)} ${symboleLocal}` : ""}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Détails Transaction ──────────────────────────────────────────────
function TransactionDetailModal({ tx, onClose, fmtXOF, isXof }: {
  tx: Transaction; onClose: () => void;
  fmtXOF: (n: number) => string; isXof: boolean;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  const handleClose = () => { setVisible(false); setTimeout(onClose, 300); };

  const isInterne = tx.type === "interne_envoi" || tx.type === "interne_recu";
  const isReceived = tx.type === "depot" || tx.type === "interne_recu";
  const typeLabel = tx.type === "depot" ? "Recharge" : tx.type === "interne_recu" ? "Transfert reçu" : tx.type === "interne_envoi" ? "Transfert interne" : "Envoi international";

  const statusConfig = {
    success: { label: "Réussi",    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    pending: { label: "En cours",  cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    failed:  { label: "Échoué",    cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    annulé:  { label: "Annulé",    cls: "bg-muted text-muted-foreground" },
    expiré:  { label: "Expiré",    cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  }[tx.status] ?? { label: tx.status, cls: "bg-muted text-muted-foreground" };

  const Row = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground font-semibold">{label}</span>
      <span className={`text-sm font-bold text-foreground ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.3s" }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="w-full max-w-md bg-card rounded-t-3xl shadow-2xl overflow-hidden border-t border-border/30"
        style={{ transform: visible ? "translateY(0)" : "translateY(100%)", transition: "transform 0.3s cubic-bezier(0.32,0.72,0,1)" }}>

        {/* Pull handle */}
        <div className="flex justify-center pt-3 pb-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Amount hero */}
        <div className="px-6 pt-5 pb-4 text-center">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">{typeLabel}</p>
          <p className={`text-4xl font-black tracking-tight ${isReceived ? "text-emerald-500" : "text-foreground"}`}>
            {isReceived ? "+" : "−"}{fmtXOF(tx.montant)}
          </p>
          {!isXof && <p className="text-xs text-muted-foreground mt-1">{fmtNum(tx.montant)} FCFA</p>}
          <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-xs font-bold ${statusConfig.cls}`}>
            {statusConfig.label}
          </div>
        </div>

        {/* Separator */}
        <div className="h-px bg-border/50 mx-6" />

        {/* Details */}
        <div className="px-6 pb-2 max-h-[40vh] overflow-y-auto">
          <Row label="Date" value={tx.date} />
          <Row label="Référence" value={tx.reference} mono />
          {tx.nom_beneficiaire && <Row label="Bénéficiaire" value={tx.nom_beneficiaire} />}
          {tx.pays && <Row label="Pays" value={`${tx.flag ?? ""} ${tx.pays}`} />}
          {tx.reseau && <Row label="Réseau" value={tx.reseau} />}
          {tx.telephone && <Row label="Numéro" value={tx.telephone} />}
          {tx.frais > 0 && <Row label="Frais" value={`${fmtNum(tx.frais)} FCFA`} />}
        </div>

        {/* Close button */}
        <div className="p-5 pt-3">
          <button onClick={handleClose}
            className="w-full py-4 flex items-center justify-center gap-2.5 bg-muted hover:bg-muted/80 text-foreground font-black rounded-2xl transition-all active:scale-[0.99] text-sm">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Composant Transaction Item ─────────────────────────────────────────────
function TxItem({ tx, onClick, fmtXOF, isXof }: {
  tx: Transaction; onClick: () => void; fmtXOF: (n: number) => string; isXof: boolean;
}) {
  const isInterne = tx.type === "interne_envoi" || tx.type === "interne_recu";
  const isReceived = tx.type === "depot" || tx.type === "interne_recu";

  const label = tx.type === "depot" ? "Recharge"
    : tx.type === "interne_recu"  ? tx.nom_beneficiaire ?? "Utilisateur"
    : tx.type === "interne_envoi" ? tx.nom_beneficiaire ?? "Utilisateur"
    : tx.nom_beneficiaire ?? tx.pays ?? "—";

  const sub = tx.type === "depot" ? "Mobile Money"
    : tx.type === "interne_recu"  ? "Reçu · Nexora"
    : tx.type === "interne_envoi" ? "Envoyé · Nexora"
    : `${tx.flag ?? ""} ${tx.pays ?? ""} · ${tx.reseau ?? ""}`;

  const statusDot = {
    success: "bg-emerald-500",
    pending: "bg-amber-400",
    failed:  "bg-red-500",
    annulé:  "bg-slate-400",
    expiré:  "bg-orange-400",
  }[tx.status] ?? "bg-muted";

  const iconBg = isInterne ? "bg-emerald-500/10" : tx.type === "depot" ? "bg-amber-500/10" : "bg-red-500/10";
  const iconColor = isInterne ? "text-emerald-500" : tx.type === "depot" ? "text-amber-500" : "text-red-500";

  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl hover:bg-muted/50 active:scale-[0.99] transition-all duration-150 text-left group">
      {/* Icon */}
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}>
        {isReceived
          ? <ArrowDownLeft className={`w-5 h-5 ${iconColor}`} />
          : isInterne
            ? <Users className={`w-5 h-5 ${iconColor}`} />
            : <Send className={`w-5 h-5 ${iconColor}`} />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-foreground truncate">{label}</span>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} />
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{sub}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{tx.date}</p>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className={`font-black text-sm ${isReceived ? "text-emerald-500" : "text-foreground"}`}>
          {isReceived ? "+" : "−"}{fmtXOF(tx.montant)}
        </p>
        {!isXof && <p className="text-[10px] text-muted-foreground">{fmtNum(tx.montant)} F</p>}
      </div>
    </button>
  );
}

// ─── Page Principale ─────────────────────────────────────────────────────────
export default function TransfertPage() {
  const { fmtXOF, rates, devise } = useDevise();
  const deviseLocale = devise;
  const symboleLocal = getSymboleDevise(deviseLocale);
  const isXof = deviseLocale === "XOF" || deviseLocale === "XAF";
  const tauxLocParXof = rates[deviseLocale] ?? 1;

  const [balance, setBalance] = useState<number>(0);
  const [nexoraId, setNexoraId] = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showRecharge, setShowRecharge] = useState(false);
  const [showTransfert, setShowTransfert] = useState(false);
  const [showInterne, setShowInterne] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "depot" | "transfert" | "interne">("all");
  const [pollingRecharge, setPollingRecharge] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState<{ montant: number; frais: number; reseau: string; tel: string; pays: ActiveCountry; nomComplet: string; } | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [visibleCount, setVisibleCount] = useState(8);

  const balanceBeforeRecharge = useRef<number>(0);

  const showSuccessMsg = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 5000); };
  const showErrorMsg   = (msg: string) => { setErrorMsg(msg);   setTimeout(() => setErrorMsg(null),   5000); };

  const soldeLocal = isXof ? balance : balance * tauxLocParXof;

  const fetchFromSupabase = useCallback(async () => {
    setLoadingData(true);
    try {
      const user = getNexoraUser();
      if (!user?.id) { setLoadingData(false); return; }

      const { data: userData } = await supabase.from("nexora_users").select("nexora_id").eq("id", user.id).maybeSingle();
      setNexoraId((userData as any)?.nexora_id ?? "");

      const { data: compte } = await supabase.from("nexora_transfert_comptes").select("solde").eq("user_id", user.id).maybeSingle();
      setBalance(compte?.solde ?? 0);

      const { data: allData } = await supabase.from("nexora_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      const txFiltered = (allData ?? []).filter(row => row.type === "recharge_transfert" || row.type === "retrait_transfert");

      const { data: payoutsData } = await supabase.from("nexora_payouts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      const payoutIds = new Set((payoutsData ?? []).map((p: any) => p.moneroo_id).filter(Boolean));
      const txOnly = txFiltered.filter(row => row.type !== "retrait_transfert" || !payoutIds.has(row.moneroo_id));

      const payoutRows = (payoutsData ?? []).map((p: any): Transaction => {
        const meta = typeof p.metadata === "string" ? JSON.parse(p.metadata) : (p.metadata ?? {});
        let status: "success" | "pending" | "failed";
        if (p.status === "completed") status = "success"; else if (p.status === "failed") status = "failed"; else status = "pending";
        return {
          id: p.id, type: "transfert", montant: p.amount ?? 0, frais: p.frais ?? 0,
          date: p.created_at ? new Date(p.created_at).toLocaleString("fr-FR") : "—", rawDate: p.created_at ?? new Date(0).toISOString(),
          pays: p.pays ?? meta.pays ?? undefined, flag: meta.pays_flag ?? undefined,
          reseau: p.reseau ?? meta.reseau ?? undefined, telephone: p.numero ?? meta.telephone ?? undefined,
          nom_beneficiaire: p.nom_beneficiaire ?? meta.nom_beneficiaire ?? undefined,
          status, reference: p.moneroo_id ?? p.id?.slice(0, 8).toUpperCase() ?? "—",
        };
      });

      const { data: interneSent } = await supabase.from("internal_transfers").select("*").eq("sender_id", user.id).order("created_at", { ascending: false });
      const { data: interneReceived } = await supabase.from("internal_transfers").select("*").eq("receiver_id", user.id).order("created_at", { ascending: false });

      const allInternalIds = new Set<string>();
      (interneSent ?? []).forEach((t: any) => allInternalIds.add(t.receiver_id));
      (interneReceived ?? []).forEach((t: any) => allInternalIds.add(t.sender_id));

      const nameMap: Record<string, string> = {};
      if (allInternalIds.size > 0) {
        const { data: names } = await supabase.from("nexora_users").select("id, nom_prenom").in("id", Array.from(allInternalIds));
        (names ?? []).forEach((n: any) => { nameMap[n.id] = n.nom_prenom; });
      }

      const interneSentRows: Transaction[] = (interneSent ?? []).map((t: any) => ({
        id: t.id, type: "interne_envoi", montant: t.amount, frais: 0,
        date: new Date(t.created_at).toLocaleString("fr-FR"), rawDate: t.created_at,
        nom_beneficiaire: nameMap[t.receiver_id] ?? "Utilisateur", status: "success",
        reference: t.id?.slice(0, 8).toUpperCase(),
      }));

      const interneReceivedRows: Transaction[] = (interneReceived ?? []).map((t: any) => ({
        id: t.id, type: "interne_recu", montant: t.amount, frais: 0,
        date: new Date(t.created_at).toLocaleString("fr-FR"), rawDate: t.created_at,
        nom_beneficiaire: nameMap[t.sender_id] ?? "Utilisateur", status: "success",
        reference: t.id?.slice(0, 8).toUpperCase(),
      }));

      const merged = [...payoutRows, ...txOnly.map(mapSupabaseRow), ...interneSentRows, ...interneReceivedRows];
      merged.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
      setTransactions(merged);
    } catch (err) {
      console.error("fetchFromSupabase error:", err);
      showErrorMsg("Erreur lors du chargement.");
    } finally { setLoadingData(false); }
  }, []);

  useEffect(() => { fetchFromSupabase(); }, [fetchFromSupabase]);

  useEffect(() => {
    if (!pollingRecharge) return;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      await fetchFromSupabase();
      if (attempts >= 20) { clearInterval(interval); setPollingRecharge(false); }
    }, 3000);
    return () => clearInterval(interval);
  }, [pollingRecharge]);

  useEffect(() => {
    if (pollingRecharge && balance > balanceBeforeRecharge.current) {
      setPollingRecharge(false); clearPendingRecharge();
      showSuccessMsg("✅ Recharge confirmée !");
    }
  }, [balance, pollingRecharge]);

  useEffect(() => { setVisibleCount(8); }, [filterType]);

  const totalDepots     = transactions.filter(t => t.type === "depot" && t.status === "success").reduce((s, t) => s + t.montant, 0);
  const totalTransferts = transactions.filter(t => (t.type === "transfert" || t.type === "interne_envoi") && t.status === "success").reduce((s, t) => s + t.montant, 0);

  const filtered = transactions.filter(t => {
    if (filterType === "all")       return true;
    if (filterType === "depot")     return t.type === "depot";
    if (filterType === "transfert") return t.type === "transfert";
    if (filterType === "interne")   return t.type === "interne_envoi" || t.type === "interne_recu";
    return true;
  });

  const copyNexoraId = () => {
    if (nexoraId) { navigator.clipboard.writeText(nexoraId); setCopiedId(true); setTimeout(() => setCopiedId(false), 2000); }
  };

  const handleRechargeSuccess = () => {
    balanceBeforeRecharge.current = balance;
    setPollingRecharge(true);
    showSuccessMsg("⏳ En attente de confirmation...");
  };

  const handleTransfertRequest = (montant: number, frais: number, reseau: string, tel: string, pays: ActiveCountry, nomComplet: string) => {
    setPendingTransfer({ montant, frais, reseau, tel, pays, nomComplet });
    setShowTransfert(false);
    setShowPinModal(true);
  };

  const handlePinSuccess = async () => {
    setShowPinModal(false);
    if (!pendingTransfer) return;
    const { montant, frais, reseau, tel, pays, nomComplet } = pendingTransfer;
    setPendingTransfer(null);
    try {
      const result = await initPayout({ type: "retrait_transfert", amount: montant, pays: pays.name, reseau, numero_mobile: tel, nom_beneficiaire: nomComplet, metadata: { pays_code: pays.code, pays_flag: pays.flag } });
      if (!result.success) { showErrorMsg(result.error ?? "Erreur lors du transfert."); return; }
      setBalance(prev => Math.max(0, prev - montant));
      const tx: Transaction = {
        id: `local-${Date.now()}`, type: "transfert", montant, frais,
        date: new Date().toLocaleString("fr-FR"), rawDate: new Date().toISOString(),
        status: "pending", reference: generateRef("TRF"),
        pays: pays.name, flag: pays.flag, reseau, telephone: tel, nom_beneficiaire: nomComplet,
      };
      setTransactions(prev => [tx, ...prev]);
      showSuccessMsg(`${fmtNum(montant)} FCFA envoyés vers ${pays.flag} ${pays.name}`);
      setTimeout(() => fetchFromSupabase(), 3000);
    } catch (err: any) { showErrorMsg(err.message ?? "Erreur réseau."); }
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Toast */}
        {successMsg && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-emerald-500 text-white px-5 py-3 rounded-2xl font-bold shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-2 max-w-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-destructive text-destructive-foreground px-5 py-3 rounded-2xl font-bold shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-2 max-w-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            HERO CARD — Solde + Nexora ID + 3 actions
        ════════════════════════════════════════════════════════ */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-2xl">

          {/* Accent glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(251,191,36,0.12),transparent_60%)]" />
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-5">

            {/* Top bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img src={LOGO_URL} alt="Nexora" className="w-8 h-8 object-contain" />
                <div>
                  <p className="text-white font-black text-sm tracking-widest">NEXORA</p>
                  <p className="text-slate-500 text-[9px] font-black tracking-[3px] uppercase">TRANSFERT</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pollingRecharge && (
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 rounded-full">
                    <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                    <span className="text-[10px] text-amber-400 font-bold">Confirmation...</span>
                  </div>
                )}
                <button onClick={() => fetchFromSupabase()} disabled={loadingData}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 transition-colors border border-white/10">
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loadingData ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Balance */}
            <div className="space-y-1">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Solde disponible</p>
              {loadingData ? (
                <div className="flex items-center gap-2 h-10">
                  <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                  <span className="text-slate-500 text-sm">Chargement...</span>
                </div>
              ) : (
                <>
                  <p className="text-4xl font-black text-white tracking-tight leading-none">
                    {fmtXOF(balance)}
                  </p>
                  {!isXof && <p className="text-slate-500 text-xs">{fmtNum(balance)} FCFA</p>}
                </>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white/5 border border-white/8 rounded-2xl p-3 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="w-3 h-3 text-amber-400" />
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wide">Rechargé</span>
                </div>
                <p className="text-white font-black text-sm">{fmtXOF(totalDepots)}</p>
              </div>
              <div className="bg-white/5 border border-white/8 rounded-2xl p-3 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-red-400" />
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wide">Envoyé</span>
                </div>
                <p className="text-white font-black text-sm">{fmtXOF(totalTransferts)}</p>
              </div>
            </div>

            {/* Nexora ID */}
            {nexoraId && (
              <div className="flex items-center gap-3 px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl">
                <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-slate-400 text-xs">Mon ID</span>
                <span className="font-mono font-black text-emerald-400 text-sm tracking-wider flex-1">{nexoraId}</span>
                <button onClick={copyNexoraId}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/8 hover:bg-white/15 transition-colors">
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                {
                  label: "Recharger",
                  icon: ArrowDownLeft,
                  color: "from-amber-500 to-orange-500",
                  shadow: "shadow-amber-500/30",
                  onClick: () => setShowRecharge(true),
                  disabled: false,
                },
                {
                  label: "Envoyer",
                  icon: Send,
                  color: "from-red-500 to-rose-600",
                  shadow: "shadow-red-500/30",
                  onClick: () => setShowTransfert(true),
                  disabled: balance === 0 || loadingData,
                },
                {
                  label: "Interne",
                  icon: Users,
                  color: "from-emerald-500 to-teal-600",
                  shadow: "shadow-emerald-500/30",
                  onClick: () => setShowInterne(true),
                  disabled: balance === 0 || loadingData,
                },
              ].map(({ label, icon: Icon, color, shadow, onClick, disabled }) => (
                <button key={label} onClick={onClick} disabled={disabled}
                  className={`flex flex-col items-center gap-2 py-3.5 bg-gradient-to-b ${color} rounded-2xl text-white font-black text-xs transition-all hover:scale-[1.03] active:scale-95 shadow-lg ${shadow} disabled:opacity-35 disabled:pointer-events-none`}>
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            HISTORIQUE
        ════════════════════════════════════════════════════════ */}
        <div className="bg-card border border-border/60 rounded-3xl overflow-hidden shadow-sm">

          {/* Section header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="font-black text-foreground text-base">Historique</h2>
            {loadingData && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 px-5 pb-3 overflow-x-auto scrollbar-hide">
            {([
              { key: "all",       label: "Tout" },
              { key: "depot",     label: "Recharges" },
              { key: "transfert", label: "Envois" },
              { key: "interne",   label: "Internes" },
            ] as const).map(f => (
              <button key={f.key} onClick={() => setFilterType(f.key)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  filterType === f.key
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-border/50 mx-5" />

          {/* List */}
          {loadingData ? (
            <div className="flex flex-col items-center py-12 space-y-3">
              <Loader2 className="w-7 h-7 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">Chargement...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 space-y-3 text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <History className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-bold text-foreground text-sm">Aucune transaction</p>
              <p className="text-xs text-muted-foreground">Commencez par recharger votre compte</p>
              <button onClick={() => setShowRecharge(true)}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition-colors flex items-center gap-2">
                <Plus className="w-3.5 h-3.5" /> Première recharge
              </button>
            </div>
          ) : (
            <div className="py-2">
              {filtered.slice(0, visibleCount).map((tx, i) => (
                <div key={tx.id}>
                  {i > 0 && <div className="h-px bg-border/30 mx-5" />}
                  <TxItem tx={tx} onClick={() => setSelectedTx(tx)} fmtXOF={fmtXOF} isXof={isXof} />
                  {/* Bouton poursuivre recharge en attente */}
                  {tx.type === "depot" && tx.status === "pending" && (
                    <div className="px-5 pb-2">
                      <button
                        onClick={() => {
                          const url = tx.checkout_url ?? loadPendingRecharge()?.payment_url;
                          if (!url) { showErrorMsg("URL introuvable. Créez une nouvelle recharge."); return; }
                          window.open(url, "_blank", "noopener,noreferrer");
                          balanceBeforeRecharge.current = balance;
                          setPollingRecharge(true);
                        }}
                        className="w-full py-2 text-xs font-bold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-300/30 transition-colors flex items-center justify-center gap-1.5">
                        <ArrowDownLeft className="w-3.5 h-3.5" /> Poursuivre le paiement
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {visibleCount < filtered.length && (
                <div className="px-5 pt-2 pb-4">
                  <button onClick={() => setVisibleCount(v => v + 8)}
                    className="w-full py-2.5 border border-dashed border-border rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all flex items-center justify-center gap-1.5">
                    <ChevronDown className="w-4 h-4" />
                    Voir plus ({filtered.length - visibleCount} restantes)
                  </button>
                </div>
              )}

              {visibleCount >= filtered.length && filtered.length > 8 && (
                <p className="text-center text-[10px] text-muted-foreground/50 py-4">
                  Toutes les transactions affichées
                </p>
              )}
            </div>
          )}
        </div>

        {/* Info footer */}
        <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-2xl text-xs text-muted-foreground border border-border/40">
          <BadgeCheck className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
          <p>Recharge : +100 FCFA · Transfert international : 3% · Nexora → Nexora : <strong className="text-emerald-500">gratuit</strong> · 24 pays africains</p>
        </div>

        {/* Modals */}
        {showRecharge  && <ModalRecharge onClose={() => setShowRecharge(false)} onSuccess={handleRechargeSuccess} />}
        {showTransfert && <ModalTransfert onClose={() => setShowTransfert(false)} onConfirm={handleTransfertRequest} balance={balance} />}
        {showInterne   && <ModalTransfertInterne onClose={() => setShowInterne(false)} balance={balance}
            onSuccess={() => { fetchFromSupabase(); showSuccessMsg("✅ Transfert interne effectué !"); }} />}

        <PinTransferModal
          isOpen={showPinModal}
          onClose={() => { setShowPinModal(false); setPendingTransfer(null); }}
          onSuccess={handlePinSuccess}
          transferDetails={pendingTransfer ? {
            amount: pendingTransfer.montant, currency: "FCFA",
            recipient: `${pendingTransfer.pays.flag} ${pendingTransfer.nomComplet} — ${pendingTransfer.reseau}`,
          } : undefined}
        />

        {selectedTx && (
          <TransactionDetailModal
            tx={selectedTx} onClose={() => setSelectedTx(null)}
            fmtXOF={fmtXOF} isXof={isXof}
          />
        )}
      </div>
    </AppLayout>
  );
}
