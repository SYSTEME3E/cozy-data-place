import { useState, useEffect, useCallback, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import {
  Send, Plus, History, Globe,
  ArrowDownLeft, ArrowUpRight, X, Check, AlertCircle,
  Download, Phone, Search, ChevronDown, Loader2,
  BadgeCheck, Lock, RefreshCw, User, MapPin
} from "lucide-react";
import { initPayment, initPayout } from "@/lib/Moneroo";
import { getNexoraUser } from "@/lib/nexora-auth";
import { supabase } from "@/integrations/supabase/client";
import PinTransferModal from "@/components/PinTransferModal";

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
  type: "depot" | "transfert";
  montant: number;
  frais: number;
  date: string;
  pays?: string;
  flag?: string;
  reseau?: string;
  telephone?: string;
  nom_beneficiaire?: string;
  status: "success" | "pending" | "failed";
  reference: string;
};

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));
const calcFrais = (montant: number) => Math.round(montant * 0.03);
const generateRef = (type: "DEP" | "TRF") => `${type}-${Date.now().toString().slice(-8)}`;

function mapSupabaseRow(row: any): Transaction {
  const meta = typeof row.metadata === "string" ? JSON.parse(row.metadata) : (row.metadata ?? {});
  const isRecharge = row.type === "recharge_transfert";
  const frais = row.frais ?? 0;
  const montant = isRecharge ? Math.max(0, (row.amount ?? 0) - frais) : (row.amount ?? 0);

  let status: "success" | "pending" | "failed";
  if (row.status === "completed") status = "success";
  else if (row.status === "pending") status = "pending";
  else status = "failed";

  return {
    id: row.id,
    type: isRecharge ? "depot" : "transfert",
    montant,
    frais,
    date: row.created_at ? new Date(row.created_at).toLocaleString("fr-FR") : "—",
    pays: meta.pays ?? undefined,
    flag: meta.pays_flag ?? undefined,
    reseau: meta.reseau ?? undefined,
    telephone: meta.telephone ?? undefined,
    nom_beneficiaire: meta.nom_beneficiaire ?? undefined,
    status,
    reference: row.moneroo_id ?? row.id?.slice(0, 8).toUpperCase() ?? "—",
  };
}

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
    <div class="row"><span class="label">Frais de service</span><span class="value">${fmt(tx.frais)} FCFA</span></div>
    ${tx.type === "transfert" ? `
    <div class="row"><span class="label">Destinataire</span><span class="value">${tx.nom_beneficiaire ?? ""}</span></div>
    <div class="row"><span class="label">Pays</span><span class="value">${tx.flag ?? ""} ${tx.pays ?? ""}</span></div>
    <div class="row"><span class="label">Réseau</span><span class="value">${tx.reseau ?? ""}</span></div>
    <div class="row"><span class="label">Numéro</span><span class="value">${tx.telephone ?? ""}</span></div>
    ` : ""}
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

// ─── COUNTRY SELECTOR ───
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

// ─── MODAL RECHARGE ───
function ModalRecharge({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [montant, setMontant] = useState("");
  const [email, setEmail] = useState(getNexoraUser()?.email ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const montantNum = parseFloat(montant) || 0;
  const fraisFixe = 100;
  const totalPaye = montantNum + fraisFixe;
  const valid = montantNum >= 100 && email.includes("@");

  const handleSubmit = async () => {
    if (!valid) return;
    setError(null);
    setLoading(true);
    try {
      const result = await initPayment({
        type: "recharge_transfert",
        amount: montantNum,
        metadata: { email },
      });

      if (!result.success || !result.payment_url) {
        setError(result.error ?? "Erreur lors de l'initialisation du paiement.");
        setLoading(false);
        return;
      }
      window.open(result.payment_url, "_blank");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Erreur réseau. Veuillez réessayer.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-black text-white">Recharger mon compte</h2>
            <p className="text-xs text-yellow-100">Paiement sécurisé · Wave, OM, MTN</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">Montant à créditer</label>
            <div className="relative">
              <input
                type="number"
                value={montant}
                onChange={e => setMontant(e.target.value)}
                placeholder="Ex: 50000"
                className="w-full px-4 py-3 pr-20 bg-muted/60 border border-border rounded-xl text-lg font-bold outline-none focus:border-yellow-400 transition-colors"
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

          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">Votre email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="w-full px-4 py-3 bg-muted/60 border border-border rounded-xl outline-none focus:border-yellow-400 transition-colors"
            />
          </div>

          {montantNum >= 100 && (
            <div className="bg-muted/60 border border-border rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Montant crédité</span>
                <span className="font-bold text-yellow-600">{fmt(montantNum)} FCFA</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Frais de service</span>
                <span>+ {fmt(fraisFixe)} FCFA</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between font-black">
                <span>Total débité</span>
                <span className="text-foreground">{fmt(totalPaye)} FCFA</span>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-xl">
            <BadgeCheck className="w-4 h-4 mt-0.5 shrink-0" />
            <p>Une page de paiement s'ouvrira. Revenez ici après le paiement, votre solde sera mis à jour automatiquement.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!valid || loading}
            className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white font-black rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Préparation...</>
              : <>Recharger {montantNum > 0 ? fmt(totalPaye) + " FCFA" : ""}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL TRANSFERT ───
function ModalTransfert({ onClose, onConfirm, balance }: {
  onClose: () => void;
  onConfirm: (montant: number, frais: number, reseau: string, tel: string, pays: ActiveCountry, nomComplet: string) => void;
  balance: number;
}) {
  const [nomComplet, setNomComplet] = useState("");
  const [montant, setMontant] = useState("");
  const [pays, setPays] = useState<ActiveCountry | null>(null);
  const [reseau, setReseau] = useState("");
  const [telephone, setTelephone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const montantNum = parseFloat(montant) || 0;
  const frais = calcFrais(montantNum);
  const netRecu = montantNum - frais;
  const soldeInsuffisant = montantNum > balance;
  const valid = montantNum >= 100 && !soldeInsuffisant && pays !== null && reseau !== "" && telephone.length >= 8 && nomComplet.trim().length >= 3;

  const handlePaysSelect = (p: ActiveCountry) => {
    setPays(p);
    setReseau(p.networks[0]);
  };

  const handleSubmit = async () => {
    if (!valid || !pays) return;
    setError(null);
    setLoading(true);
    try {
      const result = await initPayout({
        type: "retrait_transfert",
        amount: montantNum,
        pays: pays.name,
        reseau,
        numero_mobile: telephone,
        nom_beneficiaire: nomComplet,
        metadata: { pays_code: pays.code, pays_flag: pays.flag },
      });
      if (!result.success) {
        setError(result.error ?? "Erreur lors du transfert. Veuillez réessayer.");
        setLoading(false);
        return;
      }
      onConfirm(montantNum, frais, reseau, telephone, pays, nomComplet);
    } catch (err: any) {
      setError(err.message ?? "Erreur réseau. Veuillez réessayer.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <Send className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-black text-white">Envoyer de l'argent</h2>
            <p className="text-xs text-red-100">Frais : 3% · 24 pays disponibles</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/60 rounded-xl">
            <span className="text-sm text-muted-foreground font-semibold">Solde disponible</span>
            <span className="font-black text-foreground">{fmt(balance)} FCFA</span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">Nom complet du destinataire</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={nomComplet}
                onChange={e => setNomComplet(e.target.value)}
                placeholder="Jean Dupont"
                className="w-full pl-10 pr-4 py-3 bg-muted/60 border border-border rounded-xl outline-none focus:border-red-400 transition-colors"
              />
            </div>
          </div>

          <CountrySelector selected={pays} onSelect={handlePaysSelect} label="Pays du destinataire" />

          {pays && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">Réseau Mobile Money</label>
              <div className="grid grid-cols-2 gap-2">
                {pays.networks.map(n => (
                  <button
                    key={n}
                    onClick={() => setReseau(n)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all ${reseau === n ? "border-red-400 bg-red-400/10 text-red-500" : "border-border bg-muted/60 text-foreground hover:border-accent"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">Numéro du destinataire</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="tel"
                value={telephone}
                onChange={e => setTelephone(e.target.value)}
                placeholder="+229 97 00 00 00"
                className="w-full pl-10 pr-4 py-3 bg-muted/60 border border-border rounded-xl outline-none focus:border-red-400 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">Montant à envoyer</label>
            <div className="relative">
              <input
                type="number"
                value={montant}
                onChange={e => setMontant(e.target.value)}
                placeholder="Ex: 10000"
                className={`w-full px-4 py-3 pr-20 bg-muted/60 border rounded-xl text-lg font-bold outline-none transition-colors ${soldeInsuffisant ? "border-destructive" : "border-border focus:border-red-400"}`}
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

          {error && (
            <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!valid || loading}
            className="w-full py-3.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-black rounded-xl transition-colors flex items-center justify-center gap-2"
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

// ─── PAGE PRINCIPALE ───
export default function TransfertPage() {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showRecharge, setShowRecharge] = useState(false);
  const [showTransfert, setShowTransfert] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "depot" | "transfert">("all");
  const [pollingRecharge, setPollingRecharge] = useState(false);

  // ✅ FIX : ref pour mémoriser le solde avant la recharge
  const balanceBeforeRecharge = useRef<number>(0);

  const showSuccessMsg = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 6000); };
  const showErrorMsg = (msg: string) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(null), 6000); };

  // ✅ FIX : lit le solde depuis nexora_transfert_comptes (source de vérité)
  const fetchFromSupabase = useCallback(async () => {
    setLoadingData(true);
    try {
      const user = getNexoraUser();
      console.log("👤 user:", user);
      if (!user?.id) { setLoadingData(false); return; }

      // ✅ Lire le solde depuis la table gérée par le webhook
      const { data: compte, error: compteError } = await supabase
        .from("nexora_transfert_comptes")
        .select("solde")
        .eq("user_id", user.id)
        .maybeSingle();

      console.log("💰 compte:", compte, "compteError:", compteError);
      setBalance(compte?.solde ?? 0);

      // Charger TOUTES les transactions sans filtre de type pour debug
      const { data: allData, error: allError } = await supabase
        .from("nexora_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      console.log("📋 toutes les transactions:", allData, "error:", allError);

      // Filtrer côté client pour voir ce qui correspond
      const filtered = (allData ?? []).filter(
        row => row.type === "recharge_transfert" || row.type === "retrait_transfert"
      );

      console.log("🔍 transactions filtrées:", filtered);
      setTransactions(filtered.map(mapSupabaseRow));

    } catch (err) {
      console.error("fetchFromSupabase error:", err);
      showErrorMsg("Erreur lors du chargement des données.");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchFromSupabase();
  }, [fetchFromSupabase]);

  // Polling après recharge (vérifie toutes les 3s pendant 60s)
  useEffect(() => {
    if (!pollingRecharge) return;
    let attempts = 0;
    const maxAttempts = 20;

    const interval = setInterval(async () => {
      attempts++;
      await fetchFromSupabase();
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setPollingRecharge(false);
        showSuccessMsg("Vérifiez votre solde. Si la recharge n'apparaît pas, actualisez dans quelques minutes.");
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [pollingRecharge]);

  // ✅ FIX : compare avec le solde snapshot AVANT la recharge, pas juste > 0
  useEffect(() => {
    if (pollingRecharge && balance > balanceBeforeRecharge.current) {
      setPollingRecharge(false);
      showSuccessMsg("✅ Recharge confirmée ! Votre solde a été mis à jour.");
    }
  }, [balance, pollingRecharge]);

  const totalDepots = transactions.filter(t => t.type === "depot" && t.status === "success").reduce((s, t) => s + t.montant, 0);
  const totalTransferts = transactions.filter(t => t.type === "transfert" && t.status === "success").reduce((s, t) => s + t.montant, 0);
  const filtered = transactions.filter(t => filterType === "all" || t.type === filterType);

  // ✅ FIX : snapshot du solde actuel avant d'ouvrir le paiement
  const handleRechargeSuccess = () => {
    balanceBeforeRecharge.current = balance;
    setPollingRecharge(true);
    showSuccessMsg("⏳ Paiement ouvert. Votre solde sera mis à jour automatiquement après confirmation.");
  };

  const handleTransfert = (montant: number, frais: number, reseau: string, tel: string, pays: ActiveCountry, nomComplet: string) => {
    setBalance(prev => Math.max(0, prev - montant));
    const tx: Transaction = {
      id: `local-${Date.now()}`,
      type: "transfert",
      montant,
      frais,
      date: new Date().toLocaleString("fr-FR"),
      status: "pending",
      reference: generateRef("TRF"),
      pays: pays.name,
      flag: pays.flag,
      reseau,
      telephone: tel,
      nom_beneficiaire: nomComplet,
    };
    setTransactions(prev => [tx, ...prev]);
    setShowTransfert(false);
    showSuccessMsg(`${fmt(montant)} FCFA envoyés vers ${pays.flag} ${pays.name} — Traitement en cours`);
    setTimeout(() => fetchFromSupabase(), 3000);
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
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-destructive text-destructive-foreground px-5 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4" /> {errorMsg}
          </div>
        )}

        {/* HERO CARD */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-red-900 via-red-800 to-yellow-900 p-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(250,204,21,0.2),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(239,68,68,0.15),transparent_50%)]" />
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
                {pollingRecharge && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded-full">
                    <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" />
                    <span className="text-[10px] text-yellow-400 font-bold">En attente...</span>
                  </div>
                )}
                <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded-full">
                  <Globe className="w-3 h-3 text-yellow-400" />
                  <span className="text-[10px] text-yellow-400 font-bold">Mobile Money</span>
                </div>
                <button
                  onClick={() => fetchFromSupabase()}
                  disabled={loadingData}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  title="Actualiser le solde"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-white ${loadingData ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 text-xs font-semibold">Solde disponible</p>
              {loadingData ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                  <span className="text-slate-400 text-sm">Chargement...</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white tracking-tight">{fmt(balance)}</span>
                  <span className="text-sm font-bold text-slate-500">FCFA</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowRecharge(true)} className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-black rounded-xl transition-all shadow-lg shadow-yellow-500/30 hover:scale-105 active:scale-95">
                <ArrowDownLeft className="w-4 h-4" /> Recharger
              </button>
              <button onClick={() => setShowTransfert(true)} disabled={balance === 0 || loadingData} className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-red-500 hover:bg-red-400 border border-red-400/40 text-white font-black rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-red-500/30">
                <ArrowUpRight className="w-4 h-4" /> Envoyer
              </button>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center"><ArrowDownLeft className="w-3.5 h-3.5 text-yellow-500" /></div>
              <span className="text-xs font-semibold">Total rechargé</span>
            </div>
            <p className="text-lg font-black text-foreground">{fmt(totalDepots)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center"><ArrowUpRight className="w-3.5 h-3.5 text-red-500" /></div>
              <span className="text-xs font-semibold">Total envoyé</span>
            </div>
            <p className="text-lg font-black text-foreground">{fmt(totalTransferts)}</p>
          </div>
        </div>

        {/* HISTORIQUE */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <History className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-black text-foreground">Historique</h2>
            <div className="flex gap-1 ml-auto">
              {(["all", "depot", "transfert"] as const).map(f => (
                <button key={f} onClick={() => setFilterType(f)} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${filterType === f ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>
                  {f === "all" ? "Tout" : f === "depot" ? "Recharges" : "Envois"}
                </button>
              ))}
            </div>
          </div>

          {loadingData ? (
            <div className="flex flex-col items-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">Chargement...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center"><History className="w-7 h-7 text-muted-foreground" /></div>
              <p className="font-bold text-foreground text-sm">Aucune transaction</p>
              <button onClick={() => setShowRecharge(true)} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5">
                <Plus className="w-3 h-3" /> Première recharge
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tx.type === "depot" ? "bg-yellow-500/10" : "bg-red-500/10"}`}>
                    {tx.type === "depot" ? <ArrowDownLeft className="w-4 h-4 text-yellow-500" /> : <ArrowUpRight className="w-4 h-4 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground truncate">
                        {tx.type === "depot" ? "Recharge" : `${tx.flag ?? ""} ${tx.nom_beneficiaire ?? tx.pays ?? ""}`}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        tx.status === "success" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : tx.status === "pending" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                        {tx.status === "success" ? "Réussi" : tx.status === "pending" ? "En cours" : "Échoué"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {tx.reseau && <span>{tx.reseau}</span>}
                      {tx.telephone && <span>{tx.telephone}</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{tx.date}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className={`font-black text-sm ${tx.type === "depot" ? "text-yellow-500" : "text-red-500"}`}>
                        {tx.type === "depot" ? "+" : "−"}{fmt(tx.montant)}
                      </p>
                    </div>
                    <button
                      onClick={() => generateInvoicePDF(tx)}
                      title="Télécharger la facture"
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* INFO */}
        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl text-xs text-muted-foreground">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p>Frais de recharge : 100 FCFA. Frais de transfert : 3%.</p>
            <p>24 pays disponibles en Afrique.</p>
          </div>
        </div>

        {/* MODALS */}
        {showRecharge && <ModalRecharge onClose={() => setShowRecharge(false)} onSuccess={handleRechargeSuccess} />}
        {showTransfert && <ModalTransfert onClose={() => setShowTransfert(false)} onConfirm={handleTransfert} balance={balance} />}
      </div>
    </AppLayout>
  );
}
