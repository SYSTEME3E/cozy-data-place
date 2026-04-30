/**
 * NEXORA — Paiement Canal+
 * Rechargement d'abonnement Canal+ pour BJ, TG, NE, SN, CI
 */

import { useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import {
  Tv2, ChevronDown, ArrowLeft, CheckCircle2,
  AlertCircle, RefreshCw, X, Hash, Receipt,
  ChevronRight, Info, Shield, Calendar,
  Clock, History, Download, FileDown,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type Pays = {
  code: string;
  flagUrl: string;
  name: string;
  devise: string;
};

type Montant = {
  valeur: number;
  label: string;
};

type Etape =
  | "choix_pays"
  | "saisie_abonne"
  | "choix_montant"
  | "confirmation"
  | "paiement"
  | "succes"
  | "erreur";

type Transaction = {
  id: string;
  numeroAbonne: string;
  montant: number;
  frais: number;
  total: number;
  reference: string;
  dateActivation: string;
  pays: Pays;
};

// ─── Données ──────────────────────────────────────────────────────────────────

const PAYS_CANAL: Pays[] = [
  { code: "BJ", flagUrl: "https://flagcdn.com/w80/bj.png", name: "Bénin",        devise: "XOF" },
  { code: "TG", flagUrl: "https://flagcdn.com/w80/tg.png", name: "Togo",          devise: "XOF" },
  { code: "NE", flagUrl: "https://flagcdn.com/w80/ne.png", name: "Niger",         devise: "XOF" },
  { code: "SN", flagUrl: "https://flagcdn.com/w80/sn.png", name: "Sénégal",       devise: "XOF" },
  { code: "CI", flagUrl: "https://flagcdn.com/w80/ci.png", name: "Côte d'Ivoire", devise: "XOF" },
];

const MONTANTS_CANAL: Montant[] = [
  { valeur: 5000,   label: "5 000 F" },
  { valeur: 10000,  label: "10 000 F" },
  { valeur: 15000,  label: "15 000 F" },
  { valeur: 20000,  label: "20 000 F" },
  { valeur: 25000,  label: "25 000 F" },
  { valeur: 50000,  label: "50 000 F" },
  { valeur: 75000,  label: "75 000 F" },
  { valeur: 100000, label: "100 000 F" },
];

function calcFrais(montant: number): number {
  if (montant < 500) return 0;
  if (montant < 1000) return 50;
  if (montant <= 9999) return 100;
  if (montant <= 50000) return 200;
  return 500;
}

function fmtNum(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

function genRef() {
  return `CANAL-${Date.now().toString().slice(-8)}`;
}

// ─── Historique localStorage ───────────────────────────────────────────────────

const LS_KEY = "nexora_canal_history";

function loadHistory(): Transaction[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}

function saveToHistory(tx: Transaction) {
  const hist = loadHistory();
  hist.unshift(tx);
  localStorage.setItem(LS_KEY, JSON.stringify(hist.slice(0, 100)));
}

// ─── PDF Download ──────────────────────────────────────────────────────────────

async function downloadReceiptPDF(tx: Transaction) {
  try {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210, margin = 15;

    // Header Canal+ style
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, W, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("NEXORA — REÇU CANAL+", margin, 16);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Référence : ${tx.reference}`, margin, 25);
    doc.text(`Date : ${tx.dateActivation}`, margin, 32);

    // Logo Canal+ simulé
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(W - margin - 32, 8, 30, 14, 3, 3, "F");
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("CANAL+", W - margin - 17, 17, { align: "center" });

    let y = 52;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, W - margin * 2, 24, 2, 2, "F");
    doc.setTextColor(124, 58, 237);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("DÉTAILS ABONNEMENT", margin + 4, y + 7);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(`Pays : ${tx.pays.name}`, margin + 4, y + 14);
    doc.text(`Numéro abonné : ${tx.numeroAbonne}`, margin + 4, y + 20);

    y += 32;
    doc.setDrawColor(124, 58, 237);
    doc.roundedRect(margin, y, W - margin * 2, 32, 2, 2, "S");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Montant abonnement", margin + 4, y + 10);
    doc.text(`${fmtNum(tx.montant)} F CFA`, W - margin - 4, y + 10, { align: "right" });
    doc.setTextColor(15, 23, 42);
    doc.text("Frais de service", margin + 4, y + 18);
    doc.text(`${fmtNum(tx.frais)} F CFA`, W - margin - 4, y + 18, { align: "right" });
    doc.setDrawColor(241, 245, 249);
    doc.line(margin + 4, y + 22, W - margin - 4, y + 22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(124, 58, 237);
    doc.text("TOTAL PAYÉ", margin + 4, y + 28);
    doc.text(`${fmtNum(tx.total)} F CFA`, W - margin - 4, y + 28, { align: "right" });

    doc.setFillColor(124, 58, 237);
    doc.rect(0, 282, W, 15, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("NEXORA", W / 2, 288, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`Reçu généré le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}`, W / 2, 293, { align: "center" });

    doc.save(`recu_canal_${tx.reference}.pdf`);
  } catch (e) {
    toast.error("Erreur lors de la génération du PDF");
  }
}

// ─── Canal+ Logo Component ─────────────────────────────────────────────────────

function CanalPlusLogo({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-10 h-10", md: "w-12 h-12", lg: "w-16 h-16" };
  const textSizes = { sm: "text-[10px]", md: "text-xs", lg: "text-sm" };
  return (
    <div className={`${sizes[size]} rounded-2xl bg-black flex items-center justify-center shrink-0`}>
      <span className={`${textSizes[size]} font-black text-white tracking-tighter leading-none`}>
        CANAL<span className="text-yellow-400">+</span>
      </span>
    </div>
  );
}

function FlagImg({ pays }: { pays: Pays }) {
  return (
    <img src={pays.flagUrl} alt={pays.name} className="w-8 h-5 rounded-sm object-cover shadow-sm"
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
  );
}

// ─── PaysSelector ─────────────────────────────────────────────────────────────

function PaysSelector({ selected, onSelect }: { selected: Pays | null; onSelect: (p: Pays) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pays</label>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-muted/50 border border-border/60 rounded-xl hover:border-border transition-colors text-left"
      >
        {selected ? (
          <>
            <FlagImg pays={selected} />
            <div className="flex-1">
              <p className="font-bold text-sm">{selected.name}</p>
              <p className="text-xs text-muted-foreground">Canal+ — {selected.devise}</p>
            </div>
          </>
        ) : (
          <span className="text-muted-foreground text-sm">Sélectionner le pays...</span>
        )}
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-xl z-10 relative">
          {PAYS_CANAL.map(p => (
            <button key={p.code} onClick={() => { onSelect(p); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors border-b border-border/40 last:border-0 text-left ${selected?.code === p.code ? "bg-purple-50 dark:bg-purple-900/20" : ""}`}>
              <FlagImg pays={p} />
              <div>
                <p className="font-bold text-sm">{p.name}</p>
                <p className="text-xs text-muted-foreground">Canal+ — {p.devise}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Historique Panel ──────────────────────────────────────────────────────────

function HistoriquePanel() {
  const history = loadHistory();
  if (history.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Tv2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Aucune transaction enregistrée</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {history.map(tx => (
        <div key={tx.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center shrink-0">
            <span className="text-[8px] font-black text-white leading-none">C<span className="text-yellow-400">+</span></span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-purple-600">{tx.reference}</span>
              <img src={tx.pays.flagUrl} alt={tx.pays.name} className="w-5 h-3 rounded-sm object-cover" />
            </div>
            <p className="text-sm font-semibold truncate">Canal+ — {tx.numeroAbonne}</p>
            <p className="text-xs text-muted-foreground">{tx.dateActivation}</p>
            <p className="font-bold text-purple-600 text-sm">{fmtNum(tx.total)} F CFA</p>
          </div>
          <button onClick={() => downloadReceiptPDF(tx)} className="p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 transition-colors shrink-0" title="Télécharger">
            <FileDown className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────────

export default function CanalPlusPage() {
  const [etape, setEtape] = useState<Etape>("choix_pays");
  const [pays, setPays] = useState<Pays | null>(null);
  const [numeroAbonne, setNumeroAbonne] = useState("");
  const [erreurAbonne, setErreurAbonne] = useState("");
  const [montantChoisi, setMontantChoisi] = useState<Montant | null>(null);
  const [montantLibre, setMontantLibre] = useState("");
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [chargement, setChargement] = useState(false);
  const [messageErreur, setMessageErreur] = useState("");
  const [showHistorique, setShowHistorique] = useState(false);

  const montantFinal = montantChoisi?.valeur || Number(montantLibre) || 0;
  const frais = calcFrais(montantFinal);
  const total = montantFinal + frais;

  const validerAbonne = useCallback(() => {
    const num = numeroAbonne.trim().replace(/\s/g, "");
    if (!num) { setErreurAbonne("Veuillez saisir le numéro d'abonné"); return; }
    setErreurAbonne("");
    setEtape("choix_montant");
  }, [numeroAbonne]);

  const lancerPaiement = useCallback(async () => {
    if (!pays) return;
    setChargement(true);
    setEtape("paiement");
    // TODO : Intégrer le paiement Mobile Money + API Canal+
    // POST /api/canal/subscribe
    // Body: { subscriber_number, amount, country_code }
    await new Promise(r => setTimeout(r, 2000));
    const tx: Transaction = {
      id: `${Date.now()}`,
      numeroAbonne: numeroAbonne.trim(),
      montant: montantFinal,
      frais,
      total,
      reference: genRef(),
      dateActivation: new Date().toLocaleString("fr-FR"),
      pays: pays!,
    };
    saveToHistory(tx);
    setTransaction(tx);
    setChargement(false);
    setEtape("succes");
  }, [pays, numeroAbonne, montantFinal, frais, total]);

  const reset = () => {
    setEtape("choix_pays"); setPays(null); setNumeroAbonne(""); setErreurAbonne("");
    setMontantChoisi(null); setMontantLibre(""); setTransaction(null);
    setChargement(false); setMessageErreur(""); setShowHistorique(false);
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          {!["choix_pays", "succes", "erreur"].includes(etape) && !showHistorique && (
            <button onClick={() => {
              if (etape === "saisie_abonne") setEtape("choix_pays");
              else if (etape === "choix_montant") setEtape("saisie_abonne");
              else if (etape === "confirmation") setEtape("choix_montant");
            }} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-3 flex-1">
            <CanalPlusLogo size="sm" />
            <div>
              <h1 className="text-xl font-black text-foreground">Paiement Canal+</h1>
              <p className="text-xs text-muted-foreground">Rechargement abonnement — 5 pays</p>
            </div>
          </div>
          <button
            onClick={() => setShowHistorique(!showHistorique)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${showHistorique ? "bg-purple-600 text-white border-purple-600" : "border-border hover:bg-muted"}`}
          >
            <History className="w-3.5 h-3.5" /> Historique
          </button>
        </div>

        {/* Historique Panel */}
        {showHistorique && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" />
              <h2 className="font-bold text-lg">Historique des paiements</h2>
            </div>
            <HistoriquePanel />
            <button onClick={() => setShowHistorique(false)} className="w-full py-2.5 rounded-xl text-sm font-bold border border-border hover:bg-muted transition-colors">
              Retour
            </button>
          </div>
        )}

        {!showHistorique && (
          <>
            {!["paiement", "succes", "erreur"].includes(etape) && (
              <div className="flex items-center gap-1">
                {["choix_pays", "saisie_abonne", "choix_montant", "confirmation"].map((e, i) => (
                  <div key={e} className="flex-1 h-1.5 rounded-full transition-all"
                    style={{ background: ["choix_pays","saisie_abonne","choix_montant","confirmation"].indexOf(etape) >= i ? "linear-gradient(90deg, #7c3aed, #4f46e5)" : "hsl(var(--muted))" }} />
                ))}
              </div>
            )}

            {/* ── ÉTAPE 1 : Choix pays */}
            {etape === "choix_pays" && (
              <div className="space-y-5">
                <PaysSelector selected={pays} onSelect={p => { setPays(p); setNumeroAbonne(""); }} />

                {/* Canal+ Logo Banner */}
                <div className="bg-gradient-to-r from-black to-gray-900 rounded-2xl p-4 flex items-center gap-4">
                  <CanalPlusLogo size="md" />
                  <div>
                    <p className="font-black text-white text-base">Canal+</p>
                    <p className="text-xs text-gray-400">Abonnement activé instantanément après paiement</p>
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-3 flex gap-2">
                  <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    Aucun code à saisir sur votre décodeur. L'abonnement est renouvelé automatiquement.
                  </p>
                </div>

                <button disabled={!pays} onClick={() => setEtape("saisie_abonne")} className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40" style={{ background: pays ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : undefined }}>
                  Continuer <ChevronRight className="inline w-4 h-4 ml-1" />
                </button>
              </div>
            )}

            {/* ── ÉTAPE 2 : Numéro abonné */}
            {etape === "saisie_abonne" && pays && (
              <div className="space-y-5">
                <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-border">
                    <FlagImg pays={pays} />
                    <div className="flex-1">
                      <p className="font-bold text-sm">{pays.name}</p>
                      <p className="text-xs text-muted-foreground">Canal+ — Abonnement</p>
                    </div>
                    <CanalPlusLogo size="sm" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Numéro d'abonné Canal+</label>
                    <div className="relative">
                      <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        value={numeroAbonne}
                        onChange={e => { setNumeroAbonne(e.target.value); setErreurAbonne(""); }}
                        placeholder="Numéro d'abonné Canal+"
                        className={`w-full pl-10 pr-4 py-3 bg-muted/50 border rounded-xl text-sm font-mono outline-none transition-colors ${erreurAbonne ? "border-red-400" : "border-border/60 focus:border-purple-400"}`}
                        type="tel"
                        autoFocus
                      />
                    </div>
                    {erreurAbonne && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {erreurAbonne}</p>}
                    <p className="text-xs text-muted-foreground">Numéro figurant sur votre carte Canal+ ou décodeur</p>
                  </div>
                </div>

                <button disabled={!numeroAbonne.trim()} onClick={validerAbonne} className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40" style={{ background: numeroAbonne.trim() ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : undefined }}>
                  Continuer
                </button>
              </div>
            )}

            {/* ── ÉTAPE 3 : Choix montant */}
            {etape === "choix_montant" && pays && (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl p-3 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-green-800 dark:text-green-300">Abonné validé</p>
                    <p className="text-xs text-green-700 dark:text-green-400">{numeroAbonne.trim()} · Canal+ {pays.name}</p>
                  </div>
                </div>

                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Choisissez le montant</p>

                <div className="grid grid-cols-2 gap-3">
                  {MONTANTS_CANAL.map(m => {
                    const isSelected = montantChoisi?.valeur === m.valeur;
                    return (
                      <button key={m.valeur} onClick={() => { setMontantChoisi(m); setMontantLibre(""); }}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${isSelected ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" : "border-border hover:border-purple-300"}`}>
                        <p className="font-black text-base" style={{ color: isSelected ? "#7c3aed" : undefined }}>{m.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">F CFA</p>
                      </button>
                    );
                  })}
                </div>

                {/* Montant libre */}
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ou entrez un montant</p>
                  <input
                    type="number"
                    value={montantLibre}
                    onChange={e => { setMontantLibre(e.target.value); setMontantChoisi(null); }}
                    placeholder="Montant personnalisé..."
                    className="w-full px-4 py-3 bg-muted/50 border border-border/60 rounded-xl text-sm outline-none focus:border-purple-400 transition-colors"
                    min={1000}
                  />
                </div>

                {montantFinal > 0 && (
                  <div className="bg-muted/50 rounded-xl p-3 space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Abonnement</span><span className="font-bold">{fmtNum(montantFinal)} F</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Frais de service</span><span className="font-bold">{fmtNum(frais)} F</span></div>
                    <div className="border-t border-border pt-2 flex justify-between text-sm"><span className="font-bold">Total</span><span className="font-black text-purple-600">{fmtNum(total)} F</span></div>
                  </div>
                )}

                <button disabled={!montantFinal || montantFinal < 1000} onClick={() => setEtape("confirmation")} className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40" style={{ background: montantFinal >= 1000 ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : undefined }}>
                  Confirmer — {montantFinal >= 1000 ? `${fmtNum(total)} F` : ""} <ChevronRight className="inline w-4 h-4 ml-1" />
                </button>
              </div>
            )}

            {/* ── ÉTAPE 4 : Confirmation */}
            {etape === "confirmation" && pays && (
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 bg-muted/50 border-b border-border"><p className="font-bold text-sm">Récapitulatif</p></div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-muted-foreground flex items-center gap-2"><FlagImg pays={pays} /> Pays</span>
                      <span className="font-bold">{pays.name}</span>
                    </div>
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-muted-foreground flex items-center gap-2"><CanalPlusLogo size="sm" /> Opérateur</span>
                      <span className="font-bold">Canal+</span>
                    </div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> N° Abonné</span><span className="font-mono font-bold">{numeroAbonne.trim()}</span></div>
                    <div className="border-t border-border pt-3 space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Abonnement</span><span className="font-bold">{fmtNum(montantFinal)} F</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Frais</span><span className="font-bold">{fmtNum(frais)} F</span></div>
                      <div className="flex justify-between font-black text-sm"><span>TOTAL</span><span className="text-purple-600 text-base">{fmtNum(total)} F CFA</span></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-xl">
                  <Shield className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">Paiement sécurisé. Votre abonnement Canal+ sera activé instantanément.</p>
                </div>

                <button onClick={lancerPaiement} className="w-full py-3.5 rounded-xl font-bold text-sm text-white" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
                  <Tv2 className="inline w-4 h-4 mr-2" /> Payer {fmtNum(total)} F par Mobile Money
                </button>
                <button onClick={() => setEtape("choix_montant")} className="w-full py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors">Modifier</button>
              </div>
            )}

            {/* ── PAIEMENT EN COURS */}
            {etape === "paiement" && (
              <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-full border-2 border-purple-200 border-t-purple-500 animate-spin" />
                <div className="text-center">
                  <p className="font-bold text-foreground">Paiement en cours…</p>
                  <p className="text-sm text-muted-foreground mt-1">Confirmez la transaction sur votre téléphone</p>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Activation de l'abonnement en cours…</p>
              </div>
            )}

            {/* ── SUCCÈS */}
            {etape === "succes" && transaction && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-black text-foreground">Abonnement activé !</h2>
                  <p className="text-sm text-muted-foreground">Profitez de vos programmes Canal+</p>
                </div>

                {/* Canal+ confirmation card */}
                <div className="bg-gradient-to-br from-black to-gray-900 border-2 border-gray-700 rounded-2xl p-5 text-center space-y-3">
                  <CanalPlusLogo size="lg" />
                  <div>
                    <p className="font-black text-lg text-white">Canal+</p>
                    <p className="text-sm text-gray-400">Abonnement {fmtNum(transaction.montant)} F CFA</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-xs text-gray-400">Activé le</p>
                    <p className="text-base font-black text-yellow-400 mt-1">{transaction.dateActivation}</p>
                  </div>
                  <p className="text-xs text-gray-400">Aucun code à saisir — votre décodeur est déjà mis à jour</p>
                </div>

                {/* Reçu */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2"><Receipt className="w-4 h-4 text-muted-foreground" /><p className="font-bold text-sm">Reçu de transaction</p></div>
                    <button onClick={() => downloadReceiptPDF(transaction)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition-colors">
                      <Download className="w-3.5 h-3.5" /> Télécharger PDF
                    </button>
                  </div>
                  <div className="p-4 space-y-2">
                    {[
                      ["Référence", transaction.reference],
                      ["Pays", transaction.pays.name],
                      ["N° Abonné", transaction.numeroAbonne],
                      ["Montant", `${fmtNum(transaction.montant)} F`],
                      ["Frais", `${fmtNum(transaction.frais)} F`],
                      ["Total payé", `${fmtNum(transaction.total)} F`],
                      ["Activation", transaction.dateActivation],
                    ].map(([label, val]) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-bold text-right max-w-[55%] break-all">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={reset} className="w-full py-3.5 rounded-xl font-bold text-sm border border-border hover:bg-muted transition-colors">
                  <RefreshCw className="inline w-4 h-4 mr-2" /> Nouveau paiement
                </button>
              </div>
            )}

            {/* ── ERREUR */}
            {etape === "erreur" && (
              <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><X className="w-7 h-7 text-red-600" /></div>
                <div>
                  <p className="font-bold text-foreground">Paiement échoué</p>
                  <p className="text-sm text-muted-foreground mt-1">{messageErreur || "Une erreur est survenue. Réessayez ou contactez le support."}</p>
                </div>
                <button onClick={() => setEtape("confirmation")} className="px-6 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
                  Réessayer
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </AppLayout>
  );
}
