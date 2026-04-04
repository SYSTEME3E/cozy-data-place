import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import {
  Send, Plus, History, Globe,
  ArrowDownLeft, ArrowUpRight, X, Check, AlertCircle,
  Download, Phone, Search, ChevronDown, Loader2,
  BadgeCheck, Lock, ExternalLink
} from "lucide-react";
import { initPayment, initPayout } from "@/lib/Moneroo";
import { getNexoraUser } from "@/lib/nexora-auth";

const LOGO_URL = "https://i.postimg.cc/c1QgbZsG/ei_1773937801458_removebg_preview.png";

// ─── PAYS ACTIFS (24 pays) ───
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

// ─── PLUS DE PAYS BIENTÔT ───
const COMING_SOON: { code: string; flag: string; name: string }[] = [];

// ─── TYPES ───
type ActiveCountry = typeof ACTIVE_COUNTRIES[0];
type Transaction = {
  id: string;
  type: "depot" | "transfert";
  montant: number;
  frais: number;
  date: string;
  pays?: string;
  flag?: string;
  reseau?: string;
  telephone?: string;
  status: "success" | "pending" | "failed";
  reference: string;
};

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));
const calcFrais = (montant: number) => Math.round(montant * 0.03);
const generateRef = (type: "DEP" | "TRF") => `${type}-${Date.now().toString().slice(-8)}`;

// ─────────────────────────────────────────────
// PDF FACTURE
// ─────────────────────────────────────────────
function generateInvoicePDF(tx: Transaction) {
  const win = window.open("", "_blank");
  if (!win) return;
  const typeLabel = tx.type === "depot" ? "RECHARGE" : "TRANSFERT";
  const color = tx.type === "depot" ? "#10b981" : "#6366f1";
  win.document.write(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/><title>Facture ${tx.reference}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Segoe UI',sans-serif;background:#f8fafc;color:#1e293b;}
.page{max-width:680px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.12);}
.header{background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:36px 40px;display:flex;align-items:center;justify-content:space-between;}
.logo-area{display:flex;align-items:center;gap:14px;}
.logo-area img{width:52px;height:52px;object-fit:contain;}
.brand h1{font-size:22px;font-weight:900;letter-spacing:3px;color:#fff;}
.brand p{font-size:11px;color:rgba(255,255,255,.45);margin-top:2px;}
.badge{background:${color};color:#fff;border-radius:8px;padding:8px 18px;font-size:13px;font-weight:700;letter-spacing:1px;}
.body{padding:40px;}
.ref-row{display:flex;justify-content:space-between;margin-bottom:32px;padding-bottom:20px;border-bottom:1px solid #e2e8f0;}
.ref span,.date span{font-size:12px;color:#64748b;display:block;}
.ref strong{font-size:20px;font-weight:900;color:#0f172a;display:block;margin-top:2px;}
.date{text-align:right;}
.date strong{font-size:15px;font-weight:700;color:#0f172a;display:block;margin-top:2px;}
.section-title{font-size:11px;font-weight:700;letter-spacing:2px;color:#94a3b8;text-transform:uppercase;margin-bottom:16px;}
.row{display:flex;justify-content:space-between;padding:13px 0;border-bottom:1px dashed #e2e8f0;}
.row .label{color:#64748b;font-size:14px;}
.row .value{font-weight:600;color:#1e293b;font-size:14px;}
.total-box{background:#f8fafc;border:2px solid ${color};border-radius:12px;padding:20px 24px;margin:24px 0;display:flex;justify-content:space-between;align-items:center;}
.total-box .amount{font-size:28px;font-weight:900;color:${color};}
.status-row{text-align:center;margin:20px 0;}
.status-badge{display:inline-block;padding:8px 24px;border-radius:999px;font-weight:700;font-size:13px;}
.success{background:#dcfce7;color:#16a34a;}
.pending{background:#fef9c3;color:#ca8a04;}
.failed{background:#fee2e2;color:#dc2626;}
.footer{background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;}
.footer p{font-size:12px;color:#94a3b8;line-height:1.8;}
.footer strong{color:#6366f1;}
@media print{body{background:#fff;}.page{box-shadow:none;margin:0;}}
</style></head><body>
<div class="page">
  <div class="header">
    <div class="logo-area">
      <img src="${LOGO_URL}" alt="Logo"/>
      <div class="brand"><h1>NEXORA</h1><p>TRANSFERT AFRICA</p></div>
    </div>
    <div class="badge">FACTURE ${typeLabel}</div>
  </div>
  <div class="body">
    <div class="ref-row">
      <div class="ref"><span>Référence</span><strong>${tx.reference}</strong></div>
      <div class="date"><span>Date</span><strong>${tx.date}</strong></div>
    </div>
    <div class="section-title">Détails de la transaction</div>
    <div class="row"><span class="label">Type d'opération</span><span class="value">${typeLabel}</span></div>
    <div class="row"><span class="label">Montant</span><span class="value">${fmt(tx.montant)} FCFA</span></div>
    ${tx.type === "transfert" ? `
    <div class="row"><span class="label">Frais (3%)</span><span class="value">${fmt(tx.frais)} FCFA</span></div>
    <div class="row"><span class="label">Montant reçu</span><span class="value">${fmt(tx.montant - tx.frais)} FCFA</span></div>
    <div class="row"><span class="label">Pays destinataire</span><span class="value">${tx.flag} ${tx.pays}</span></div>
    <div class="row"><span class="label">Réseau</span><span class="value">${tx.reseau}</span></div>
    <div class="row"><span class="label">Numéro</span><span class="value">${tx.telephone}</span></div>
    ` : `
    <div class="row"><span class="label">Frais de recharge</span><span class="value">100 FCFA</span></div>
    `}
    <div class="total-box">
      <span>Total débité</span>
      <span class="amount">${fmt(tx.montant)} FCFA</span>
    </div>
    <div class="status-row">
      <span class="status-badge ${tx.status}">${tx.status === "success" ? "✓ Opération réussie" : tx.status === "pending" ? "⏳ En cours" : "✗ Échouée"}</span>
    </div>
  </div>
  <div class="footer">
    <p>Facture générée par <strong>NEXORA TRANSFERT</strong><br/>
    Support : support@nexora.africa<br/>
    © ${new Date().getFullYear()} NEXORA — Tous droits réservés</p>
  </div>
</div></body></html>`);
  win.document.close();
}

// ─────────────────────────────────────────────
// COUNTRY SELECTOR
// ─────────────────────────────────────────────
function CountrySelector({ selected, onSelect, label }: {
  selected: ActiveCountry | null;
  onSelect: (c: ActiveCountry) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = ACTIVE_COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.networks.some(n => n.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-muted-foreground">{label}</label>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/60 border border-border rounded-xl hover:border-accent transition-colors text-left"
      >
        {selected ? (
          <>
            <span className="text-2xl">{selected.flag}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground">{selected.name}</p>
              <p className="text-xs text-muted-foreground truncate">{selected.networks.join(" · ")}</p>
            </div>
          </>
        ) : (
          <span className="text-muted-foreground text-sm">Sélectionner un pays...</span>
        )}
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-lg">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Pays ou réseau..."
                className="w-full pl-9 pr-3 py-2 bg-muted rounded-lg text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0
              ? <p className="p-4 text-sm text-muted-foreground text-center">Aucun résultat</p>
              : filtered.map(c => (
                <button
                  key={c.code}
                  onClick={() => { onSelect(c); setOpen(false); setSearch(""); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/70 transition-colors text-left"
                >
                  <span className="text-xl">{c.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.networks.join(" · ")}</p>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{c.currency}</span>
                </button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL RECHARGE — GENIUSPAY
// Pays + réseau (auto selon pays) + téléphone + montant
// Frais fixes : 100 FCFA — redirection GeniusPay
// ─────────────────────────────────────────────
function ModalRecharge({ onClose }: { onClose: () => void }) {
  const [montant, setMontant] = useState("");
  const [pays, setPays] = useState<ActiveCountry | null>(null);
  const [reseau, setReseau] = useState("");
  const [telephone, setTelephone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const montantNum = parseFloat(montant) || 0;
  const fraisFixe  = 100;
  const totalPaye  = montantNum + fraisFixe;
  const valid      = montantNum >= 100 && pays !== null && reseau !== "" && telephone.length >= 8;

  // Quand le pays change, sélectionner automatiquement le premier réseau
  const handlePaysSelect = (p: ActiveCountry) => {
    setPays(p);
    setReseau(p.networks[0]); // Auto-sélection du premier réseau
  };

  const handleSubmit = async () => {
    if (!valid) return;
    setError(null);
    setLoading(true);
    try {
      const result = await initPayment({
        type:   "recharge_transfert",
        amount: montantNum,
        metadata: {
          reseau:    reseau,
          telephone: telephone,
          pays:      pays?.name ?? "",
        },
      });
      if (!result.success || !result.payment_url) {
        setError(result.error ?? "Erreur lors de l'initialisation du paiement.");
        setLoading(false);
        return;
      }
      window.location.href = result.payment_url;
    } catch (err: any) {
      setError(err.message ?? "Erreur réseau. Veuillez réessayer.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-black text-white">Recharger mon compte</h2>
            <p className="text-xs text-emerald-100">Paiement sécurisé GeniusPay · Wave, OM, MTN</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Montant */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">Montant à recharger</label>
            <div className="relative">
              <input
                type="number"
                value={montant}
                onChange={e => setMontant(e.target.value)}
                placeholder="Ex: 50000"
                className="w-full px-4 py-3 pr-20 bg-muted/60 border border-border rounded-xl text-lg font-bold outline-none focus:border-emerald-400 transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">FCFA</span>
            </div>
            <div className="flex gap-2">
              {[5000, 10000, 25000, 50000].map(v => (
                <button
                  key={v}
                  onClick={() => setMontant(String(v))}
                  className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-muted hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {fmt(v)}
                </button>
              ))}
            </div>
          </div>

          {/* Pays */}
          <CountrySelector selected={pays} onSelect={handlePaysSelect} label="Pays de votre réseau" />

          {/* Réseau — s'affiche automatiquement selon le pays */}
          {pays && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">Réseau Mobile Money</label>
              <div className="grid grid-cols-2 gap-2">
                {pays.networks.map(n => (
                  <button
                    key={n}
                    onClick={() => setReseau(n)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all ${reseau === n ? "border-emerald-400 bg-emerald-400/10 text-emerald-500" : "border-border bg-muted/60 text-foreground hover:border-accent"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Téléphone */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">Votre numéro Mobile Money</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="tel"
                value={telephone}
                onChange={e => setTelephone(e.target.value)}
                placeholder="+229 97 00 00 00"
                className="w-full pl-10 pr-4 py-3 bg-muted/60 border border-border rounded-xl outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
          </div>

          {/* Récap frais */}
          {montantNum >= 100 && (
            <div className="bg-muted/60 border border-border rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Montant crédité sur votre compte</span>
                <span className="font-bold text-foreground">{fmt(montantNum)} FCFA</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Frais de service NEXORA</span>
                <span>+ {fmt(fraisFixe)} FCFA</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between font-black">
                <span>Total débité</span>
                <span className="text-emerald-600">{fmt(totalPaye)} FCFA</span>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="flex items-start gap-2 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl">
            <BadgeCheck className="w-4 h-4 mt-0.5 shrink-0" />
            <p>Vous serez redirigé vers GeniusPay pour finaliser le paiement. Votre compte sera crédité automatiquement après confirmation.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!valid || loading}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirection en cours...</>
              : <><ExternalLink className="w-4 h-4" /> Payer {montantNum > 0 ? fmt(totalPaye) + " FCFA" : ""}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL TRANSFERT — GENIUSPAY PAYOUT
// ─────────────────────────────────────────────
function ModalTransfert({ onClose, onConfirm, balance }: {
  onClose: () => void;
  onConfirm: (montant: number, frais: number, reseau: string, tel: string, pays: ActiveCountry) => void;
  balance: number;
}) {
  const [montant, setMontant] = useState("");
  const [pays, setPays] = useState<ActiveCountry | null>(null);
  const [reseau, setReseau] = useState("");
  const [telephone, setTelephone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const montantNum       = parseFloat(montant) || 0;
  const frais            = calcFrais(montantNum);
  const netRecu          = montantNum - frais;
  const soldeInsuffisant = montantNum > balance;
  const valid = montantNum >= 100 && !soldeInsuffisant && pays !== null && reseau !== "" && telephone.length >= 8;

  // Auto-sélection du premier réseau quand pays change
  const handlePaysSelect = (p: ActiveCountry) => {
    setPays(p);
    setReseau(p.networks[0]);
  };

  const handleSubmit = async () => {
    if (!valid || !pays) return;
    setError(null);
    setLoading(true);
    try {
      const user = getNexoraUser();
      const result = await initPayout({
        type:             "retrait_transfert",
        amount:           montantNum,
        pays:             pays.name,
        reseau:           reseau,
        numero_mobile:    telephone,
        nom_beneficiaire: user?.nom_prenom ?? "Client NEXORA",
        metadata: { pays_code: pays.code, pays_flag: pays.flag },
      });
      if (!result.success) {
        setError(result.error ?? "Erreur lors du transfert. Veuillez réessayer.");
        setLoading(false);
        return;
      }
      onConfirm(montantNum, frais, reseau, telephone, pays);
    } catch (err: any) {
      setError(err.message ?? "Erreur réseau. Veuillez réessayer.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500 to-indigo-600 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <Send className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-black text-white">Envoyer de l'argent</h2>
            <p className="text-xs text-violet-100">Frais : 3% · 5 pays disponibles</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Solde */}
          <div className="flex items-center justify-between p-3 bg-muted/60 rounded-xl">
            <span className="text-sm text-muted-foreground font-semibold">Solde disponible</span>
            <span className="font-black text-foreground">{fmt(balance)} FCFA</span>
          </div>

          {/* Montant */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">Montant à envoyer</label>
            <div className="relative">
              <input
                type="number"
                value={montant}
                onChange={e => setMontant(e.target.value)}
                placeholder="Ex: 10000"
                className={`w-full px-4 py-3 pr-20 bg-muted/60 border rounded-xl text-lg font-bold outline-none transition-colors ${soldeInsuffisant ? "border-destructive" : "border-border focus:border-violet-400"}`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">FCFA</span>
            </div>
            {montantNum > 0 && (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Frais (3%)</span>
                  <span>− {fmt(frais)} FCFA</span>
                </div>
                <div className="flex justify-between font-bold text-foreground">
                  <span>Le destinataire reçoit</span>
                  <span>{fmt(netRecu > 0 ? netRecu : 0)} FCFA</span>
                </div>
              </div>
            )}
            {soldeInsuffisant && (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="w-3.5 h-3.5" />
                <p>Solde insuffisant. Rechargez votre compte.</p>
              </div>
            )}
          </div>

          {/* Pays */}
          <CountrySelector selected={pays} onSelect={handlePaysSelect} label="Pays destinataire" />

          {/* Réseau — s'affiche automatiquement selon le pays */}
          {pays && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">Réseau Mobile Money</label>
              <div className="grid grid-cols-2 gap-2">
                {pays.networks.map(n => (
                  <button
                    key={n}
                    onClick={() => setReseau(n)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all ${reseau === n ? "border-violet-400 bg-violet-400/10 text-violet-500" : "border-border bg-muted/60 text-foreground hover:border-accent"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Téléphone */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">Numéro du destinataire</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="tel"
                value={telephone}
                onChange={e => setTelephone(e.target.value)}
                placeholder="+221 77 000 00 00"
                className="w-full pl-10 pr-4 py-3 bg-muted/60 border border-border rounded-xl outline-none focus:border-violet-400 transition-colors"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!valid || loading}
            className="w-full py-3.5 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white font-black rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Traitement en cours...</>
              : <><Send className="w-4 h-4" /> Envoyer {montantNum > 0 ? fmt(montantNum) + " FCFA" : ""}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────
export default function TransfertPage() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showRecharge, setShowRecharge] = useState(false);
  const [showTransfert, setShowTransfert] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "depot" | "transfert">("all");

  // Détecter retour GeniusPay après paiement
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type   = params.get("type");
    const status = params.get("status");
    if (type === "transfert" && status === "success") {
      showSuccessMsg("Recharge confirmée ! Votre solde sera mis à jour dans quelques instants.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (type === "transfert" && status === "failed") {
      showErrorMsg("Le paiement a été annulé ou a échoué. Veuillez réessayer.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const totalDepots     = transactions.filter(t => t.type === "depot"     && t.status === "success").reduce((s, t) => s + t.montant, 0);
  const totalTransferts = transactions.filter(t => t.type === "transfert" && t.status === "success").reduce((s, t) => s + t.montant, 0);
  const filtered        = transactions.filter(t => filterType === "all" || t.type === filterType);

  const showSuccessMsg = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 4000); };
  const showErrorMsg   = (msg: string) => { setErrorMsg(msg);   setTimeout(() => setErrorMsg(null),   5000); };

  const handleTransfert = (montant: number, frais: number, reseau: string, tel: string, pays: ActiveCountry) => {
    const tx: Transaction = {
      id: Date.now().toString(), type: "transfert", montant, frais,
      date: new Date().toLocaleString("fr-FR"), status: "pending",
      reference: generateRef("TRF"), pays: pays.name, flag: pays.flag, reseau, telephone: tel,
    };
    setTransactions(prev => [tx, ...prev]);
    setBalance(prev => prev - montant);
    setShowTransfert(false);
    showSuccessMsg(`${fmt(montant)} FCFA envoyés vers ${pays.flag} ${pays.name} — Traitement en cours`);
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {successMsg && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-emerald-500 text-white px-5 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <Check className="w-4 h-4" /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-red-500 text-white px-5 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4" /> {errorMsg}
          </div>
        )}

        {/* ── HERO CARD ── */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.1),transparent_50%)]" />
          <div className="relative z-10 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={LOGO_URL} alt="Nexora" className="w-10 h-10 object-contain" />
                <div>
                  <h1 className="text-white font-black text-lg tracking-wider">Nexora</h1>
                  <p className="text-slate-400 text-[10px] font-bold tracking-[3px] uppercase">TRANSFERT</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
            
                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 rounded-full">
                  <Globe className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] text-emerald-400 font-bold">Mobile Money</span>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 text-xs font-semibold">Solde disponible</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white tracking-tight">{fmt(balance)}</span>
                <span className="text-sm font-bold text-slate-500">FCFA</span>
              </div>
              {balance === 0 && <p className="text-xs text-slate-500">Rechargez votre compte pour commencer</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowRecharge(true)} className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-emerald-400 hover:bg-emerald-300 text-slate-900 font-black rounded-xl transition-all shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95">
                <ArrowDownLeft className="w-4 h-4" /> Recharger
              </button>
              <button onClick={() => setShowTransfert(true)} disabled={balance === 0} className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 hover:border-white/40 text-white font-black rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100">
                <ArrowUpRight className="w-4 h-4" /> Envoyer
              </button>
            </div>
          </div>
        </div>

        {/* ── STATS ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center"><ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" /></div>
              <span className="text-xs font-semibold">Total rechargé</span>
            </div>
            <p className="text-lg font-black text-foreground">{fmt(totalDepots)}</p>
            <p className="text-[10px] text-muted-foreground">FCFA · +100 FCFA/recharge</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center"><ArrowUpRight className="w-3.5 h-3.5 text-violet-500" /></div>
              <span className="text-xs font-semibold">Total envoyé</span>
            </div>
            <p className="text-lg font-black text-foreground">{fmt(totalTransferts)}</p>
            <p className="text-[10px] text-muted-foreground">FCFA · Frais inclus</p>
          </div>
        </div>

        {/* ── PAYS ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-black text-foreground">Pays disponibles</h2>
          </div>
          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">✓ Disponibles maintenant</p>
          <div className="flex flex-wrap gap-2">
            {ACTIVE_COUNTRIES.map(c => (
              <span key={c.code} className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-full text-xs font-semibold text-foreground">
                <span className="text-base">{c.flag}</span><span>{c.name}</span>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-2">
            <Lock className="w-3 h-3" /> Bientôt disponibles
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COMING_SOON.map(c => (
              <span key={c.code} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/50 rounded-full text-[11px] text-muted-foreground">
                <span className="text-sm">{c.flag}</span><span>{c.name}</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── HISTORIQUE ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <History className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-black text-foreground">Historique des transactions</h2>
            <div className="flex gap-1 ml-auto">
              {(["all", "depot", "transfert"] as const).map(f => (
                <button key={f} onClick={() => setFilterType(f)} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${filterType === f ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>
                  {f === "all" ? "Tout" : f === "depot" ? "Recharges" : "Transferts"}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center"><History className="w-7 h-7 text-muted-foreground" /></div>
              <div className="text-center">
                <p className="font-bold text-foreground text-sm">Aucune transaction</p>
                <p className="text-xs text-muted-foreground">Vos transactions apparaîtront ici</p>
              </div>
              <button onClick={() => setShowRecharge(true)} className="mt-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5">
                <Plus className="w-3 h-3" /> Faire ma première recharge
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tx.type === "depot" ? "bg-emerald-500/10" : "bg-violet-500/10"}`}>
                    {tx.type === "depot" ? <ArrowDownLeft className="w-4 h-4 text-emerald-500" /> : <ArrowUpRight className="w-4 h-4 text-violet-500" />}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground truncate">{tx.type === "depot" ? "Recharge" : `${tx.flag} ${tx.pays}`}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tx.status === "success" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : tx.status === "pending" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                        {tx.status === "success" ? "Réussi" : tx.status === "pending" ? "En cours" : "Échoué"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {tx.reseau && <span>{tx.reseau}</span>}
                      {tx.telephone && <span>{tx.telephone}</span>}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span>{tx.reference}</span><span>·</span><span>{tx.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className={`font-black text-sm ${tx.type === "depot" ? "text-emerald-500" : "text-violet-500"}`}>
                        {tx.type === "depot" ? "+" : "−"}{fmt(tx.montant)}
                      </p>
                      {tx.frais > 0 && <p className="text-[10px] text-muted-foreground">frais {fmt(tx.frais)}</p>}
                    </div>
                    <button onClick={() => generateInvoicePDF(tx)} title="Télécharger la facture PDF" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── INFO ── */}
        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl text-xs text-muted-foreground">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p>NEXORA TRANSFERT — Recharge via GeniusPay (Wave, Orange Money, MTN, Moov).</p>
            <p>Frais de recharge : 100 FCFA. Frais de transfert : 3% déduits du montant envoyé.</p>
            <p>Disponible au Bénin, Côte d'Ivoire, Togo, Sénégal et Niger. D'autres pays arrivent bientôt.</p>
          </div>
        </div>

      </div>

      {showRecharge  && <ModalRecharge  onClose={() => setShowRecharge(false)} />}
      {showTransfert && <ModalTransfert onClose={() => setShowTransfert(false)} onConfirm={handleTransfert} balance={balance} />}
    </AppLayout>
  );
}
