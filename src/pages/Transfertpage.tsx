import { useState, useEffect, useCallback, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import {
  Send, Plus, History, Globe,
  ArrowDownLeft, ArrowUpRight, X, Check, AlertCircle,
  Download, Phone, Search, ChevronDown, Loader2,
  BadgeCheck, RefreshCw, User, MapPin,
  Copy, Users, Zap, Shield, QrCode
} from "lucide-react";
import { initPayment, initPayout } from "@/lib/Moneroo";
import { getNexoraUser } from "@/lib/nexora-auth";
import { supabase } from "@/integrations/supabase/client";
import PinTransferModal from "@/components/PinTransferModal";
import { useDevise, DEVISES_LISTE } from "@/lib/devise-context";

const LOGO_URL = "https://i.postimg.cc/c1QgbZsG/ei_1773937801458_removebg_preview.png";

// ─── Liste des pays ────────────────────────────────────────────────────────────
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
  status: "success" | "pending" | "failed";
  reference: string;
};

// ─── Utilitaires ────────────────────────────────────────────────────────────
const fmtNum = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));
const calcFrais = (montant: number) => Math.round(montant * 0.03);
const generateRef = (type: "DEP" | "TRF") => `${type}-${Date.now().toString().slice(-8)}`;

/** Récupère la devise persistée depuis le dashboard */
function getDevisePersistee(): string {
  try { return localStorage.getItem("nexora-devise") || "XOF"; } catch { return "XOF"; }
}

/** Nom de la devise */
function getSymboleDevise(code: string): string {
  return DEVISES_LISTE.find(d => d.code === code)?.symbole ?? code;
}

// ─── Countdown 5 min ─────────────────────────────────────────────────────────
function useCountdown(rawDate: string, isPending: boolean): string | null {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!isPending) { setRemaining(null); return; }
    const expiry = new Date(rawDate).getTime() + 5 * 60 * 1000;
    const tick = () => { const diff = expiry - Date.now(); setRemaining(diff > 0 ? diff : 0); };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [rawDate, isPending]);
  if (remaining === null) return null;
  if (remaining === 0) return "Expiré";
  const m = Math.floor(remaining / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return `Expire dans ${m}:${s.toString().padStart(2, "0")}`;
}

function CountdownBadge({ rawDate }: { rawDate: string }) {
  const label = useCountdown(rawDate, true);
  if (!label) return null;
  const isExpired = label === "Expiré";
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
      isExpired
        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
    }`}>
      ⏱ {label}
    </span>
  );
}

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
    rawDate: row.created_at ?? new Date(0).toISOString(),
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
  const typeLabel = tx.type === "depot" ? "RECHARGE" : "TRANSFERT";
  const color = tx.type === "depot" ? "#10b981" : "#6366f1";
  const html = `<!DOCTYPE html>
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
    <div class="row"><span class="label">Montant</span><span class="value">${fmtNum(tx.montant)} FCFA</span></div>
    <div class="row"><span class="label">Frais de service</span><span class="value">${fmtNum(tx.frais)} FCFA</span></div>
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
</div></body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Facture-${tx.reference}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ─── COUNTRY SELECTOR ────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// MODAL RECHARGE
// Saisie en devise locale → conversion FCFA → API
// ─────────────────────────────────────────────────────────────────────────────
function ModalRecharge({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { fmtXOF, rates, devise } = useDevise();

  // Devise active depuis le contexte global (réactive au changement du dashboard)
  const deviseLocale = devise;
  const symboleLocal = getSymboleDevise(deviseLocale);
  const isXof = deviseLocale === "XOF" || deviseLocale === "XAF";

  // Taux : combien de devises locales pour 1 XOF
  const tauxLocParXof = rates[deviseLocale] ?? 1;
  // Taux inverse : combien de XOF pour 1 devise locale
  const tauxXofParLoc = tauxLocParXof > 0 ? 1 / tauxLocParXof : 1;

  const [montant, setMontant] = useState("");
  const [email, setEmail] = useState(getNexoraUser()?.email ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const montantLocalNum = parseFloat(montant) || 0;
  // Conversion en FCFA (arrondi)
  const montantFcfa = isXof ? montantLocalNum : Math.round(montantLocalNum * tauxXofParLoc);
  const fraisFixe = 100; // FCFA
  const totalPaye = montantFcfa + fraisFixe;

  // Montants-rapide en devise locale
  const quickValues = isXof
    ? [5000, 10000, 25000, 50000]
    : [5000, 10000, 25000, 50000].map(v => Math.round(v * tauxLocParXof));

  const valid = montantFcfa >= 200 && email.includes("@");

  const handleSubmit = async () => {
    if (!valid) return;
    setError(null);
    setLoading(true);
    try {
      // ✅ L'API reçoit toujours le montant en FCFA
      const result = await initPayment({
        type: "recharge_transfert",
        amount: montantFcfa,
        metadata: { email },
      });
      if (!result.success || !result.payment_url) {
        setError(result.error ?? "Erreur lors de l'initialisation du paiement.");
        setLoading(false);
        return;
      }
      const opened = window.open(result.payment_url, "_blank", "noopener,noreferrer");
      if (!opened) { setPaymentUrl(result.payment_url); }
      else { onSuccess(); onClose(); }
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
            <p className="text-xs text-yellow-100">
              Saisie en {symboleLocal} · Paiement sécurisé
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Devise locale active */}
          {!isXof && (
            <div className="flex items-center gap-2 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-600 font-semibold">
              <Globe className="w-3.5 h-3.5" />
              Devise active : <strong>{deviseLocale}</strong> · 1 {deviseLocale} ≈ {Math.round(tauxXofParLoc)} FCFA
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">
              Montant à créditer ({symboleLocal})
            </label>
            <div className="relative">
              <input
                type="number"
                value={montant}
                onChange={e => setMontant(e.target.value)}
                placeholder="Ex: 10 000"
                className="w-full px-4 py-3 pr-20 bg-muted/60 border border-border rounded-xl text-lg font-bold outline-none focus:border-yellow-400 transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                {symboleLocal}
              </span>
            </div>
            <div className="flex gap-2">
              {quickValues.map(v => (
                <button
                  key={v}
                  onClick={() => setMontant(String(v))}
                  className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-muted hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {fmtNum(v)}
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

          {montantFcfa >= 200 && (
            <div className="bg-muted/60 border border-border rounded-xl p-4 space-y-2 text-sm">
              {!isXof && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Montant saisi</span>
                  <span className="font-bold">{fmtNum(montantLocalNum)} {symboleLocal}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Montant crédité (FCFA)</span>
                <span className="font-bold text-yellow-600">{fmtNum(montantFcfa)} FCFA</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Frais de service</span>
                <span>+ {fmtNum(fraisFixe)} FCFA</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between font-black">
                <span>Total débité</span>
                <span className="text-foreground">{fmtNum(totalPaye)} FCFA</span>
              </div>
            </div>
          )}

          {!isXof && montantFcfa < 200 && montantLocalNum > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5" />
              Montant minimum : 200 FCFA (≈ {Math.ceil(200 * tauxLocParXof)} {symboleLocal})
            </div>
          )}

          <div className="flex items-start gap-2 text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-xl">
            <BadgeCheck className="w-4 h-4 mt-0.5 shrink-0" />
            <p>Une page de paiement s'ouvrira. Votre solde sera mis à jour automatiquement après confirmation.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {paymentUrl && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 space-y-2">
              <p className="text-xs text-yellow-400 font-semibold">🔒 Paiement créé. Cliquez pour ouvrir la page GeniusPay.</p>
              <a href={paymentUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-yellow-400 text-black font-black rounded-xl hover:bg-yellow-300 transition-colors text-sm">
                Ouvrir le paiement
              </a>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!valid || loading}
            className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white font-black rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Préparation...</>
              : <>Recharger {montantFcfa > 0 ? `${fmtNum(totalPaye)} FCFA` : ""}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL TRANSFERT (ENVOYER)
// Saisie en devise locale → vérifie solde en local → convert en FCFA → API
// ─────────────────────────────────────────────────────────────────────────────
function ModalTransfert({ onClose, onConfirm, balance }: {
  onClose: () => void;
  onConfirm: (montantFcfa: number, frais: number, reseau: string, tel: string, pays: ActiveCountry, nomComplet: string) => void;
  balance: number; // balance en FCFA
}) {
  const { fmtXOF, xofTo, rates, devise } = useDevise();

  const deviseLocale  = devise; // Réactif au contexte global
  const symboleLocal  = getSymboleDevise(deviseLocale);
  const isXof         = deviseLocale === "XOF" || deviseLocale === "XAF";
  const tauxLocParXof = rates[deviseLocale] ?? 1;
  const tauxXofParLoc = tauxLocParXof > 0 ? 1 / tauxLocParXof : 1;

  // Solde affiché en devise locale
  // Pas de Math.round → précision décimale pour EUR/USD/GBP
  const soldeLocal = isXof ? balance : balance * tauxLocParXof;

  const [nomComplet, setNomComplet] = useState("");
  const [montant, setMontant]       = useState("");  // en devise locale
  const [pays, setPays]             = useState<ActiveCountry | null>(null);
  const [reseau, setReseau]         = useState("");
  const [telephone, setTelephone]   = useState("");

  const montantLocalNum = parseFloat(montant) || 0;
  // Conversion du montant saisi → FCFA pour l'API
  const montantFcfa = isXof ? montantLocalNum : Math.round(montantLocalNum * tauxXofParLoc);

  const frais   = calcFrais(montantFcfa);
  const netRecu = montantFcfa - frais;

  // ✅ Vérification solde en devise locale
  const soldeInsuffisant = montantLocalNum > soldeLocal;

  const valid = montantFcfa >= 200 && !soldeInsuffisant && pays !== null
    && reseau !== "" && telephone.length >= 8 && nomComplet.trim().length >= 3;

  // Conversion dans la devise du pays destinataire
  const deviseDestinataire = pays?.currency ?? "XOF";
  const memeDevise = deviseDestinataire === "XOF" || deviseDestinataire === "XAF";
  const montantConverti = netRecu > 0 ? xofTo(netRecu, deviseDestinataire) : 0;

  const handlePaysSelect = (p: ActiveCountry) => {
    setPays(p);
    setReseau(p.networks[0]);
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
          {/* Solde en devise locale */}
          <div className="flex items-center justify-between p-3 bg-muted/60 rounded-xl">
            <span className="text-sm text-muted-foreground font-semibold">Solde disponible</span>
            <div className="text-right">
              <span className="font-black text-foreground">
                {fmtXOF(balance)}
              </span>
              {!isXof && (
                <p className="text-[10px] text-muted-foreground">{fmtNum(balance)} FCFA</p>
              )}
            </div>
          </div>

          {!isXof && (
            <div className="flex items-center gap-2 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-600 font-semibold">
              <Globe className="w-3.5 h-3.5" />
              Devise : <strong>{deviseLocale}</strong> · 1 {deviseLocale} ≈ {Math.round(tauxXofParLoc)} FCFA
            </div>
          )}

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
            <label className="text-sm font-semibold text-muted-foreground">
              Montant à envoyer ({symboleLocal}, min. 200 FCFA)
            </label>
            <div className="relative">
              <input
                type="number"
                value={montant}
                onChange={e => setMontant(e.target.value)}
                placeholder="Ex: 10 000"
                className={`w-full px-4 py-3 pr-24 bg-muted/60 border rounded-xl text-lg font-bold outline-none transition-colors ${soldeInsuffisant ? "border-destructive" : "border-border focus:border-red-400"}`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                {symboleLocal}
              </span>
            </div>

            {montantFcfa > 0 && (
              <div className="space-y-1 text-xs bg-muted/40 rounded-xl p-3">
                {!isXof && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Équivalent FCFA</span>
                    <span className="font-bold">{fmtNum(montantFcfa)} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Frais (3%)</span>
                  <span>− {fmtNum(frais)} FCFA</span>
                </div>
                <div className="flex justify-between font-bold text-foreground border-t border-border/50 pt-1 mt-1">
                  <span>Le destinataire reçoit</span>
                  <span className="text-green-500">
                    {memeDevise
                      ? `${fmtNum(netRecu > 0 ? netRecu : 0)} ${deviseDestinataire}`
                      : `≈ ${new Intl.NumberFormat("fr-FR").format(montantConverti)} ${deviseDestinataire}`
                    }
                  </span>
                </div>
                {!memeDevise && netRecu > 0 && (
                  <div className="flex justify-between text-muted-foreground text-[10px] pt-0.5">
                    <span>Équivalent XOF</span>
                    <span>{fmtNum(netRecu)} XOF</span>
                  </div>
                )}
              </div>
            )}

            {soldeInsuffisant && (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="w-3.5 h-3.5" />
                Fonds insuffisants. Votre solde est {fmtXOF(balance)}.
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (!valid || !pays) return;
              // ✅ On passe uniquement le montant en FCFA à l'API
              onConfirm(montantFcfa, frais, reseau, telephone, pays, nomComplet);
            }}
            disabled={!valid}
            className="w-full py-3.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-black rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Envoyer {montantFcfa > 0 ? `${fmtNum(montantFcfa)} FCFA` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL TRANSFERT INTERNE
// Saisie en devise locale → vérifie solde local → convert en FCFA
// ─────────────────────────────────────────────────────────────────────────────
function ModalTransfertInterne({ onClose, onSuccess, balance }: {
  onClose: () => void;
  onSuccess: () => void;
  balance: number; // en FCFA
}) {
  const { fmtXOF, rates, devise } = useDevise();

  const deviseLocale  = devise; // Réactif au contexte global
  const symboleLocal  = getSymboleDevise(deviseLocale);
  const isXof         = deviseLocale === "XOF" || deviseLocale === "XAF";
  const tauxLocParXof = rates[deviseLocale] ?? 1;
  const tauxXofParLoc = tauxLocParXof > 0 ? 1 / tauxLocParXof : 1;

  // Pas de Math.round → précision décimale pour EUR/USD/GBP
  const soldeLocal = isXof ? balance : balance * tauxLocParXof;

  const [nexoraId, setNexoraId]         = useState("");
  const [montant, setMontant]           = useState(""); // en devise locale
  const [note, setNote]                 = useState("");
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [receiverName, setReceiverName] = useState<string | null>(null);
  const [lookingUp, setLookingUp]       = useState(false);

  const montantLocalNum = parseFloat(montant) || 0;
  // ✅ Conversion → FCFA
  const montantFcfa = isXof ? montantLocalNum : Math.round(montantLocalNum * tauxXofParLoc);

  const valid = montantLocalNum >= 1
    && montantLocalNum <= soldeLocal
    && receiverName !== null
    && nexoraId.trim().length >= 4;

  const lookupUser = async () => {
    if (!nexoraId.trim()) return;
    setLookingUp(true);
    setReceiverName(null);
    setError(null);
    const { data } = await supabase
      .from("nexora_users")
      .select("nom_prenom, nexora_id")
      .eq("nexora_id", nexoraId.trim().toUpperCase())
      .maybeSingle();
    setLookingUp(false);
    if (data) {
      setReceiverName((data as any).nom_prenom);
    } else {
      setError("Aucun utilisateur trouvé avec cet ID.");
    }
  };

  const handleSubmit = async () => {
    if (!valid) return;
    setLoading(true);
    setError(null);
    const user = getNexoraUser();
    if (!user?.id) { setError("Non connecté"); setLoading(false); return; }

    const { data: receiver } = await supabase
      .from("nexora_users")
      .select("id, nom_prenom")
      .eq("nexora_id", nexoraId.trim().toUpperCase())
      .maybeSingle();

    if (!receiver) { setError("Destinataire introuvable."); setLoading(false); return; }
    if ((receiver as any).id === user.id) { setError("Vous ne pouvez pas vous envoyer à vous-même."); setLoading(false); return; }

    // ✅ On utilise montantFcfa (converti) pour la transaction en base
    const { error: deductErr } = await supabase.rpc("transfer_internal" as any, {
      p_sender_id: user.id,
      p_receiver_id: (receiver as any).id,
      p_amount: montantFcfa,
      p_note: note || null,
    } as any);

    if (deductErr) {
      const { data: senderAccount } = await supabase
        .from("nexora_transfert_comptes")
        .select("solde")
        .eq("user_id", user.id)
        .maybeSingle();

      const senderSolde = senderAccount?.solde ?? 0;
      if (senderSolde < montantFcfa) { setError("Solde insuffisant."); setLoading(false); return; }

      await supabase
        .from("nexora_transfert_comptes")
        .update({ solde: senderSolde - montantFcfa, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      const { data: recvAccount } = await supabase
        .from("nexora_transfert_comptes")
        .select("solde")
        .eq("user_id", (receiver as any).id)
        .maybeSingle();

      if (recvAccount) {
        await supabase
          .from("nexora_transfert_comptes")
          .update({ solde: (recvAccount.solde ?? 0) + montantFcfa, updated_at: new Date().toISOString() })
          .eq("user_id", (receiver as any).id);
      } else {
        await supabase
          .from("nexora_transfert_comptes")
          .insert({ user_id: (receiver as any).id, solde: montantFcfa });
      }

      await supabase
        .from("internal_transfers")
        .insert({
          sender_id: user.id,
          receiver_id: (receiver as any).id,
          amount: montantFcfa,
          note: note || null,
        });
    }

    setLoading(false);
    onSuccess();
    onClose();
  };

  // Montants rapides en devise locale
  const quickValues = isXof
    ? [1000, 5000, 10000, 25000]
    : [1000, 5000, 10000, 25000].map(v => Math.round(v * tauxLocParXof));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-black text-white">Transfert interne</h2>
            <p className="text-xs text-emerald-100">Entre utilisateurs Nexora · 0 FCFA de frais</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Solde en devise locale */}
          <div className="flex items-center justify-between p-3 bg-muted/60 rounded-xl">
            <span className="text-sm text-muted-foreground font-semibold">Solde disponible</span>
            <div className="text-right">
              <span className="font-black text-foreground">
                {fmtXOF(balance)}
              </span>
              {!isXof && (
                <p className="text-[10px] text-muted-foreground">{fmtNum(balance)} FCFA</p>
              )}
            </div>
          </div>

          {!isXof && (
            <div className="flex items-center gap-2 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-600 font-semibold">
              <Globe className="w-3.5 h-3.5" />
              Devise : <strong>{deviseLocale}</strong> · 1 {deviseLocale} ≈ {Math.round(tauxXofParLoc)} FCFA
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">ID Nexora du destinataire</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={nexoraId}
                  onChange={e => { setNexoraId(e.target.value.toUpperCase()); setReceiverName(null); }}
                  placeholder="NX-XXXXXX"
                  className="w-full pl-10 pr-4 py-3 bg-muted/60 border border-border rounded-xl outline-none focus:border-emerald-400 transition-colors font-mono uppercase"
                />
              </div>
              <button
                onClick={lookupUser}
                disabled={lookingUp || !nexoraId.trim()}
                className="px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm"
              >
                {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>
            {receiverName && (
              <div className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-bold text-emerald-600">{receiverName}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">
              Montant ({symboleLocal})
            </label>
            <div className="relative">
              <input
                type="number"
                value={montant}
                onChange={e => setMontant(e.target.value)}
                placeholder="Ex: 5 000"
                className="w-full px-4 py-3 pr-24 bg-muted/60 border border-border rounded-xl text-lg font-bold outline-none focus:border-emerald-400 transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                {symboleLocal}
              </span>
            </div>
            <div className="flex gap-2">
              {quickValues.map(v => (
                <button key={v} onClick={() => setMontant(String(v))}
                  className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-muted hover:bg-accent hover:text-accent-foreground transition-colors">
                  {fmtNum(v)}
                </button>
              ))}
            </div>
            {/* Conversion FCFA affichée si devise locale différente */}
            {!isXof && montantFcfa > 0 && (
              <p className="text-[11px] text-muted-foreground">
                ≈ {fmtNum(montantFcfa)} FCFA envoyés
              </p>
            )}
            {montantLocalNum > soldeLocal && (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="w-3.5 h-3.5" />
                Fonds insuffisants. Solde : {fmtXOF(balance)}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">Note (optionnel)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ex: Remboursement repas"
              className="w-full px-4 py-3 bg-muted/60 border border-border rounded-xl outline-none focus:border-emerald-400 transition-colors text-sm"
            />
          </div>

          <div className="flex items-start gap-2 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl">
            <Zap className="w-4 h-4 mt-0.5 shrink-0" />
            <p>Transfert instantané entre comptes Nexora. <strong>0 FCFA de frais.</strong> Le destinataire reçoit le montant exact.</p>
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
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours...</>
              : <><Zap className="w-4 h-4" /> Envoyer {montantLocalNum > 0 ? `${fmtNum(montantLocalNum)} ${symboleLocal}` : ""}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────
export default function TransfertPage() {
  const { fmtXOF, rates, devise } = useDevise();

  const deviseLocale  = devise; // Réactif au contexte global (changement depuis dashboard)
  const symboleLocal  = getSymboleDevise(deviseLocale);
  const isXof         = deviseLocale === "XOF" || deviseLocale === "XAF";
  const tauxLocParXof = rates[deviseLocale] ?? 1;

  const [balance, setBalance]           = useState<number>(0);
  const [nexoraId, setNexoraId]         = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData]   = useState(true);
  const [showRecharge, setShowRecharge] = useState(false);
  const [showTransfert, setShowTransfert] = useState(false);
  const [showInterne, setShowInterne]   = useState(false);
  const [successMsg, setSuccessMsg]     = useState<string | null>(null);
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);
  const [filterType, setFilterType]     = useState<"all" | "depot" | "transfert" | "interne">("all");
  const [pollingRecharge, setPollingRecharge] = useState(false);
  const [copiedId, setCopiedId]         = useState(false);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState<{
    montant: number; frais: number; reseau: string; tel: string; pays: ActiveCountry; nomComplet: string;
  } | null>(null);

  const balanceBeforeRecharge = useRef<number>(0);

  const showSuccessMsg = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 6000); };
  const showErrorMsg   = (msg: string) => { setErrorMsg(msg);   setTimeout(() => setErrorMsg(null),   6000); };

  // Solde affiché en devise locale (sans arrondi pour précision EUR/USD/GBP)
  const soldeLocal = isXof ? balance : balance * tauxLocParXof;

  const fetchFromSupabase = useCallback(async () => {
    setLoadingData(true);
    try {
      const user = getNexoraUser();
      if (!user?.id) { setLoadingData(false); return; }

      const { data: userData } = await supabase
        .from("nexora_users").select("nexora_id").eq("id", user.id).maybeSingle();
      setNexoraId((userData as any)?.nexora_id ?? "");

      const { data: compte } = await supabase
        .from("nexora_transfert_comptes").select("solde").eq("user_id", user.id).maybeSingle();
      setBalance(compte?.solde ?? 0);

      const { data: allData } = await supabase
        .from("nexora_transactions").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const txFiltered = (allData ?? []).filter(
        row => row.type === "recharge_transfert" || row.type === "retrait_transfert"
      );

      const { data: payoutsData } = await supabase
        .from("nexora_payouts").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const payoutIds = new Set((payoutsData ?? []).map((p: any) => p.moneroo_id).filter(Boolean));
      const txOnly = txFiltered.filter(row =>
        row.type !== "retrait_transfert" || !payoutIds.has(row.moneroo_id)
      );

      const payoutRows = (payoutsData ?? []).map((p: any): Transaction => {
        const meta = typeof p.metadata === "string" ? JSON.parse(p.metadata) : (p.metadata ?? {});
        let status: "success" | "pending" | "failed";
        if (p.status === "completed") status = "success";
        else if (p.status === "failed") status = "failed";
        else status = "pending";
        return {
          id: p.id, type: "transfert", montant: p.amount ?? 0, frais: p.frais ?? 0,
          date: p.created_at ? new Date(p.created_at).toLocaleString("fr-FR") : "—",
          rawDate: p.created_at ?? new Date(0).toISOString(),
          pays: p.pays ?? meta.pays ?? undefined, flag: meta.pays_flag ?? undefined,
          reseau: p.reseau ?? meta.reseau ?? undefined,
          telephone: p.numero ?? meta.telephone ?? undefined,
          nom_beneficiaire: p.nom_beneficiaire ?? meta.nom_beneficiaire ?? undefined,
          status, reference: p.moneroo_id ?? p.id?.slice(0, 8).toUpperCase() ?? "—",
        };
      });

      const { data: interneSent }     = await supabase.from("internal_transfers").select("*").eq("sender_id", user.id).order("created_at", { ascending: false });
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
        nom_beneficiaire: nameMap[t.receiver_id] ?? "Utilisateur",
        status: "success", reference: t.id?.slice(0, 8).toUpperCase(),
      }));

      const interneReceivedRows: Transaction[] = (interneReceived ?? []).map((t: any) => ({
        id: t.id, type: "interne_recu", montant: t.amount, frais: 0,
        date: new Date(t.created_at).toLocaleString("fr-FR"), rawDate: t.created_at,
        nom_beneficiaire: nameMap[t.sender_id] ?? "Utilisateur",
        status: "success", reference: t.id?.slice(0, 8).toUpperCase(),
      }));

      const merged = [...payoutRows, ...txOnly.map(mapSupabaseRow), ...interneSentRows, ...interneReceivedRows];
      merged.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
      setTransactions(merged);
    } catch (err) {
      console.error("fetchFromSupabase error:", err);
      showErrorMsg("Erreur lors du chargement des données.");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { fetchFromSupabase(); }, [fetchFromSupabase]);

  useEffect(() => {
    if (!pollingRecharge) return;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      await fetchFromSupabase();
      if (attempts >= 20) {
        clearInterval(interval);
        setPollingRecharge(false);
        showSuccessMsg("Vérifiez votre solde. Si la recharge n'apparaît pas, actualisez dans quelques minutes.");
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [pollingRecharge]);

  useEffect(() => {
    if (pollingRecharge && balance > balanceBeforeRecharge.current) {
      setPollingRecharge(false);
      showSuccessMsg("✅ Recharge confirmée ! Votre solde a été mis à jour.");
    }
  }, [balance, pollingRecharge]);

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
    showSuccessMsg("⏳ Paiement ouvert. Votre solde sera mis à jour automatiquement après confirmation.");
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
      const result = await initPayout({
        type: "retrait_transfert",
        amount: montant, // ✅ déjà en FCFA
        pays: pays.name,
        reseau,
        numero_mobile: tel,
        nom_beneficiaire: nomComplet,
        metadata: { pays_code: pays.code, pays_flag: pays.flag },
      });
      if (!result.success) { showErrorMsg(result.error ?? "Erreur lors du transfert."); return; }
      setBalance(prev => Math.max(0, prev - montant));
      const tx: Transaction = {
        id: `local-${Date.now()}`, type: "transfert", montant, frais,
        date: new Date().toLocaleString("fr-FR"), rawDate: new Date().toISOString(),
        status: "pending", reference: generateRef("TRF"),
        pays: pays.name, flag: pays.flag, reseau, telephone: tel, nom_beneficiaire: nomComplet,
      };
      setTransactions(prev => [tx, ...prev]);
      showSuccessMsg(`${fmtNum(montant)} FCFA envoyés vers ${pays.flag} ${pays.name} — Traitement en cours`);
      setTimeout(() => fetchFromSupabase(), 3000);
    } catch (err: any) {
      showErrorMsg(err.message ?? "Erreur réseau. Veuillez réessayer.");
    }
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {successMsg && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-emerald-500 text-white px-5 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2">
            <Check className="w-4 h-4" /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-destructive text-destructive-foreground px-5 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {errorMsg}
          </div>
        )}

        {/* HERO CARD */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-red-900 via-red-800 to-yellow-900 p-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(250,204,21,0.2),transparent_50%)]" />
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
                <div>
                  {/* Solde en devise locale */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white tracking-tight">
                      {fmtXOF(balance)}
                    </span>
                  </div>
                  {/* Équivalent FCFA si devise différente */}
                  {!isXof && (
                    <p className="text-slate-400 text-xs mt-0.5">
                      {fmtNum(balance)} FCFA
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Nexora ID */}
            {nexoraId && (
              <div className="flex items-center gap-2 p-2.5 bg-white/10 rounded-xl">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-slate-300 font-semibold">Mon ID :</span>
                <span className="font-mono font-black text-emerald-400 text-sm tracking-wider">{nexoraId}</span>
                <button onClick={copyNexoraId} className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white" />}
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setShowRecharge(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-black rounded-xl transition-all shadow-lg shadow-yellow-500/30 hover:scale-105 active:scale-95 text-sm">
                <ArrowDownLeft className="w-4 h-4" /> Recharger
              </button>
              <button onClick={() => setShowTransfert(true)} disabled={balance === 0 || loadingData}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-400 text-white font-black rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm shadow-lg shadow-red-500/30">
                <ArrowUpRight className="w-4 h-4" /> Envoyer
              </button>
              <button onClick={() => setShowInterne(true)} disabled={balance === 0 || loadingData}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm shadow-lg shadow-emerald-500/30">
                <Users className="w-4 h-4" /> Interne
              </button>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <ArrowDownLeft className="w-3.5 h-3.5 text-yellow-500" />
              </div>
              <span className="text-xs font-semibold">Total rechargé</span>
            </div>
            <p className="text-lg font-black text-foreground">{fmtXOF(totalDepots)}</p>
            {!isXof && <p className="text-[10px] text-muted-foreground">{fmtNum(totalDepots)} FCFA</p>}
          </div>
          <div className="bg-card border border-border rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />
              </div>
              <span className="text-xs font-semibold">Total envoyé</span>
            </div>
            <p className="text-lg font-black text-foreground">{fmtXOF(totalTransferts)}</p>
            {!isXof && <p className="text-[10px] text-muted-foreground">{fmtNum(totalTransferts)} FCFA</p>}
          </div>
        </div>

        {/* HISTORIQUE */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <History className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-black text-foreground">Historique</h2>
            <div className="flex gap-1 ml-auto flex-wrap">
              {(["all", "depot", "transfert", "interne"] as const).map(f => (
                <button key={f} onClick={() => setFilterType(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${filterType === f ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>
                  {f === "all" ? "Tout" : f === "depot" ? "Recharges" : f === "transfert" ? "Envois" : "Internes"}
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
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <History className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="font-bold text-foreground text-sm">Aucune transaction</p>
              <button onClick={() => setShowRecharge(true)}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5">
                <Plus className="w-3 h-3" /> Première recharge
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(tx => {
                const isInterne  = tx.type === "interne_envoi" || tx.type === "interne_recu";
                const isReceived = tx.type === "depot" || tx.type === "interne_recu";
                const iconBg    = isInterne ? "bg-emerald-500/10" : tx.type === "depot" ? "bg-yellow-500/10" : "bg-red-500/10";
                const iconColor = isInterne ? "text-emerald-500" : tx.type === "depot" ? "text-yellow-500" : "text-red-500";
                const amountColor = isReceived ? "text-emerald-500" : "text-red-500";
                const label = tx.type === "depot" ? "Recharge"
                  : tx.type === "interne_recu" ? `↓ De ${tx.nom_beneficiaire ?? "Utilisateur"}`
                  : tx.type === "interne_envoi" ? `↑ Vers ${tx.nom_beneficiaire ?? "Utilisateur"}`
                  : `${tx.flag ?? ""} ${tx.nom_beneficiaire ?? tx.pays ?? ""}`;

                return (
                  <div key={tx.id} className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl shadow-sm">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}>
                      {isReceived
                        ? <ArrowDownLeft className={`w-5 h-5 ${iconColor}`} />
                        : isInterne
                          ? <Users className={`w-5 h-5 ${iconColor}`} />
                          : <ArrowUpRight className={`w-5 h-5 ${iconColor}`} />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground truncate">{label}</span>
                        {isInterne && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            0 frais
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          tx.status === "success" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : tx.status === "pending" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                          {tx.status === "success" ? "Réussi" : tx.status === "pending" ? "En cours" : "Échoué"}
                        </span>
                        {tx.status === "pending" && <CountdownBadge rawDate={tx.rawDate} />}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {tx.reseau && <span>{tx.reseau}</span>}
                        {tx.telephone && <span>{tx.telephone}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{tx.date}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className={`font-black text-base ${amountColor}`}>
                          {isReceived ? "+" : "−"}{fmtXOF(tx.montant)}
                        </p>
                        {!isXof && <p className="text-[10px] text-muted-foreground">{fmtNum(tx.montant)} FCFA</p>}
                      </div>
                      <button onClick={() => generateInvoicePDF(tx)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-muted hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground border border-border">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* INFO */}
        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl text-xs text-muted-foreground">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p>Frais de recharge : 100 FCFA. Frais de transfert international : 3%.</p>
            <p>Transfert interne entre utilisateurs Nexora : <strong className="text-emerald-500">0 FCFA de frais</strong>.</p>
            <p>Saisie en <strong>{symboleLocal}</strong> · Paiement API toujours en FCFA.</p>
            <p>24 pays disponibles en Afrique.</p>
          </div>
        </div>

        {/* MODALS */}
        {showRecharge   && <ModalRecharge onClose={() => setShowRecharge(false)} onSuccess={handleRechargeSuccess} />}
        {showTransfert  && <ModalTransfert onClose={() => setShowTransfert(false)} onConfirm={handleTransfertRequest} balance={balance} />}
        {showInterne    && <ModalTransfertInterne onClose={() => setShowInterne(false)} balance={balance}
            onSuccess={() => { fetchFromSupabase(); showSuccessMsg("✅ Transfert interne effectué avec succès !"); }} />}

        <PinTransferModal
          isOpen={showPinModal}
          onClose={() => { setShowPinModal(false); setPendingTransfer(null); }}
          onSuccess={handlePinSuccess}
          transferDetails={pendingTransfer ? {
            amount: pendingTransfer.montant,
            currency: "FCFA",
            recipient: `${pendingTransfer.pays.flag} ${pendingTransfer.nomComplet} — ${pendingTransfer.reseau}`,
          } : undefined}
        />
      </div>
    </AppLayout>
  );
}
