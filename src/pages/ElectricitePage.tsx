/**
 * NEXORA — Paiement Électricité
 * SBEE (BJ) · CEET (TG) · NIGELEC (NE) · SENELEC (SN) · CIE (CI)
 */

import { useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import {
  Zap, ChevronDown, Search, ArrowLeft, Copy, Share2,
  CheckCircle2, AlertCircle, RefreshCw, X,
  Hash, Banknote, Receipt, ChevronRight,
  Info, Shield, Clock, History, Download, FileDown,
} from "lucide-react";
import { toast } from "sonner";

type Pays = {
  code: string;
  flagUrl: string;
  name: string;
  operateur: string;
  operateurCode: string;
  compteurLabel: string;
  compteurPlaceholder: string;
};

type Etape = "choix_pays" | "saisie" | "montant" | "confirmation" | "paiement" | "succes" | "erreur";

type Transaction = {
  id: string;
  montant: number;
  frais: number;
  total: number;
  reference: string;
  compteur: string;
  pays: Pays;
  date: string;
};

const PAYS_ELECTRIQUE: Pays[] = [
  { code: "BJ", flagUrl: "https://flagcdn.com/w80/bj.png", name: "Bénin", operateur: "SBEE", operateurCode: "sbee", compteurLabel: "Numéro de compteur SBEE", compteurPlaceholder: "Entrez le numéro de compteur" },
  { code: "TG", flagUrl: "https://flagcdn.com/w80/tg.png", name: "Togo", operateur: "CEET", operateurCode: "ceet", compteurLabel: "Numéro de compteur CEET", compteurPlaceholder: "Entrez le numéro de compteur" },
  { code: "NE", flagUrl: "https://flagcdn.com/w80/ne.png", name: "Niger", operateur: "NIGELEC", operateurCode: "nigelec", compteurLabel: "Numéro de compteur NIGELEC", compteurPlaceholder: "Entrez le numéro de compteur" },
  { code: "SN", flagUrl: "https://flagcdn.com/w80/sn.png", name: "Sénégal", operateur: "SENELEC", operateurCode: "senelec", compteurLabel: "Numéro de compteur SENELEC", compteurPlaceholder: "Entrez le numéro de compteur" },
  { code: "CI", flagUrl: "https://flagcdn.com/w80/ci.png", name: "Côte d'Ivoire", operateur: "CIE", operateurCode: "cie", compteurLabel: "Numéro de compteur CIE", compteurPlaceholder: "Entrez le numéro de compteur" },
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
  return `ELEC-${Date.now().toString().slice(-8)}`;
}

const LS_KEY = "nexora_elec_history";

function loadHistory(): Transaction[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}

function saveToHistory(tx: Transaction) {
  const hist = loadHistory();
  hist.unshift(tx);
  localStorage.setItem(LS_KEY, JSON.stringify(hist.slice(0, 100)));
}

async function downloadReceiptPDF(tx: Transaction) {
  try {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210, margin = 15;

    doc.setFillColor(245, 158, 11);
    doc.rect(0, 0, W, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("NEXORA — REÇU ÉLECTRICITÉ", margin, 16);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Référence : ${tx.reference}`, margin, 25);
    doc.text(`Date : ${tx.date}`, margin, 32);

    let y = 52;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, W - margin * 2, 24, 2, 2, "F");
    doc.setTextColor(245, 158, 11);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("DÉTAILS PAIEMENT", margin + 4, y + 7);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(`Pays : ${tx.pays.name}`, margin + 4, y + 14);
    doc.text(`Opérateur : ${tx.pays.operateur}`, margin + 4, y + 20);
    doc.text(`Compteur : ${tx.compteur}`, margin + 85, y + 14);

    y += 32;
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(margin, y, W - margin * 2, 40, 2, 2, "S");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Montant rechargé", margin + 4, y + 10);
    doc.text(`${fmtNum(tx.montant)} F CFA`, W - margin - 4, y + 10, { align: "right" });
    doc.setTextColor(15, 23, 42);
    doc.text("Frais de service", margin + 4, y + 18);
    doc.text(`${fmtNum(tx.frais)} F CFA`, W - margin - 4, y + 18, { align: "right" });
    doc.setDrawColor(241, 245, 249);
    doc.line(margin + 4, y + 22, W - margin - 4, y + 22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(245, 158, 11);
    doc.text("TOTAL PAYÉ", margin + 4, y + 32);
    doc.text(`${fmtNum(tx.total)} F CFA`, W - margin - 4, y + 32, { align: "right" });

    doc.setFillColor(245, 158, 11);
    doc.rect(0, 282, W, 15, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("NEXORA", W / 2, 288, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`Reçu généré le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}`, W / 2, 293, { align: "center" });

    doc.save(`recu_elec_${tx.reference}.pdf`);
  } catch (e) {
    toast.error("Erreur lors de la génération du PDF");
  }
}

function FlagImg({ pays }: { pays: Pays }) {
  return (
    <img
      src={pays.flagUrl}
      alt={pays.name}
      className="w-8 h-5 rounded-sm object-cover shadow-sm"
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}

function PaysSelector({ selected, onSelect }: { selected: Pays | null; onSelect: (p: Pays) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = PAYS_ELECTRIQUE.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.operateur.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pays & Opérateur</label>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-muted/50 border border-border/60 rounded-xl hover:border-border transition-colors text-left"
      >
        {selected ? (
          <>
            <FlagImg pays={selected} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground">{selected.name}</p>
              <p className="text-xs text-muted-foreground">{selected.operateur} — Prépayé</p>
            </div>
          </>
        ) : (
          <span className="text-muted-foreground text-sm">Sélectionner le pays...</span>
        )}
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-xl z-10 relative">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full pl-8 pr-3 py-2 bg-muted rounded-lg text-sm outline-none" autoFocus />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.map(p => (
              <button key={p.code} onClick={() => { onSelect(p); setOpen(false); setSearch(""); }} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left border-b border-border/40 last:border-0 ${selected?.code === p.code ? "bg-yellow-50 dark:bg-yellow-900/20" : ""}`}>
                <FlagImg pays={p} />
                <div className="flex-1">
                  <p className="font-bold text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.operateur}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HistoriquePanel() {
  const history = loadHistory();
  if (history.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Receipt className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Aucune transaction enregistrée</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {history.map(tx => (
        <div key={tx.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-yellow-600">{tx.reference}</span>
              <img src={tx.pays.flagUrl} alt={tx.pays.name} className="w-5 h-3 rounded-sm object-cover" />
            </div>
            <p className="text-sm font-semibold truncate">{tx.pays.operateur} — {tx.compteur}</p>
            <p className="text-xs text-muted-foreground">{tx.date}</p>
            <p className="font-bold text-yellow-600 text-sm">{fmtNum(tx.total)} F CFA</p>
          </div>
          <button onClick={() => downloadReceiptPDF(tx)} className="p-2 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-600 transition-colors shrink-0" title="Télécharger">
            <FileDown className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function ElectricitePage() {
  const [etape, setEtape] = useState<Etape>("choix_pays");
  const [pays, setPays] = useState<Pays | null>(null);
  const [numeroCompteur, setNumeroCompteur] = useState("");
  const [erreurCompteur, setErreurCompteur] = useState("");
  const [montant, setMontant] = useState("");
  const [erreurMontant, setErreurMontant] = useState("");
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [chargement, setChargement] = useState(false);
  const [messageErreur, setMessageErreur] = useState("");
  const [showHistorique, setShowHistorique] = useState(false);

  const frais = calcFrais(Number(montant) || 0);
  const total = (Number(montant) || 0) + frais;
  const montantsRapides = [500, 1000, 2000, 5000, 10000, 20000];

  const validerCompteur = useCallback(() => {
    if (!pays) return;
    if (!numeroCompteur.trim()) { setErreurCompteur("Veuillez saisir le numéro de compteur"); return; }
    setErreurCompteur("");
    setEtape("montant");
  }, [pays, numeroCompteur]);

  const validerMontant = useCallback(() => {
    const m = Number(montant);
    if (!m || m < 500) { setErreurMontant("Le montant minimum est 500 F"); return; }
    setErreurMontant("");
    setEtape("confirmation");
  }, [montant]);

  const lancerPaiement = useCallback(async () => {
    if (!pays) return;
    setChargement(true);
    setEtape("paiement");
    // TODO : Intégrer le paiement Mobile Money
    // POST /api/electricity/recharge
    // Body: { meter_number, amount, operator_code, country_code }
    await new Promise(r => setTimeout(r, 2000));
    const tx: Transaction = {
      id: `${Date.now()}`,
      montant: Number(montant),
      frais, total,
      reference: genRef(),
      compteur: numeroCompteur.trim().toUpperCase(),
      pays,
      date: new Date().toLocaleString("fr-FR"),
    };
    saveToHistory(tx);
    setTransaction(tx);
    setChargement(false);
    setEtape("succes");
  }, [montant, frais, total, pays, numeroCompteur]);

  const reset = () => {
    setEtape("choix_pays"); setPays(null); setNumeroCompteur(""); setErreurCompteur("");
    setMontant(""); setErreurMontant(""); setTransaction(null); setChargement(false);
    setMessageErreur(""); setShowHistorique(false);
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          {etape !== "choix_pays" && etape !== "succes" && !showHistorique && (
            <button onClick={() => {
              if (etape === "saisie") setEtape("choix_pays");
              else if (etape === "montant") setEtape("saisie");
              else if (etape === "confirmation") setEtape("montant");
            }} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground">Paiement Électricité</h1>
              <p className="text-xs text-muted-foreground">SBEE · CEET · NIGELEC · SENELEC · CIE</p>
            </div>
          </div>
          <button
            onClick={() => setShowHistorique(!showHistorique)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${showHistorique ? "bg-yellow-500 text-white border-yellow-500" : "border-border hover:bg-muted"}`}
          >
            <History className="w-3.5 h-3.5" /> Historique
          </button>
        </div>

        {/* Historique Panel */}
        {showHistorique && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-yellow-500" />
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
                {["choix_pays", "saisie", "montant", "confirmation"].map((e, i) => (
                  <div key={e} className={`flex-1 h-1.5 rounded-full transition-all ${["choix_pays", "saisie", "montant", "confirmation"].indexOf(etape) >= i ? "bg-yellow-500" : "bg-muted"}`} />
                ))}
              </div>
            )}

            {/* ── ÉTAPE 1 : Choix pays */}
            {etape === "choix_pays" && (
              <div className="space-y-5">
                <PaysSelector selected={pays} onSelect={p => { setPays(p); setNumeroCompteur(""); }} />
                {pays && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-xl p-3 flex gap-3 items-center">
                    <img src={pays.flagUrl} alt={pays.name} className="w-8 h-5 rounded-sm object-cover shrink-0" />
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      <span className="font-bold">{pays.name}</span> — Paiement sécurisé pour votre compteur {pays.operateur}.
                    </p>
                  </div>
                )}
                <button disabled={!pays} onClick={() => setEtape("saisie")} className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: pays ? "linear-gradient(135deg, #f59e0b, #f97316)" : undefined }}>
                  Continuer <ChevronRight className="inline w-4 h-4 ml-1" />
                </button>
              </div>
            )}

            {/* ── ÉTAPE 2 : Saisie compteur */}
            {etape === "saisie" && pays && (
              <div className="space-y-5">
                <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-border">
                    <img src={pays.flagUrl} alt={pays.name} className="w-8 h-5 rounded-sm object-cover" />
                    <div>
                      <p className="font-bold text-sm">{pays.name} — {pays.operateur}</p>
                      <p className="text-xs text-muted-foreground">Compteur prépayé</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{pays.compteurLabel}</label>
                    <div className="relative">
                      <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input value={numeroCompteur} onChange={e => { setNumeroCompteur(e.target.value); setErreurCompteur(""); }} placeholder={pays.compteurPlaceholder} className={`w-full pl-10 pr-4 py-3 bg-muted/50 border rounded-xl text-sm font-mono outline-none transition-colors ${erreurCompteur ? "border-red-400" : "border-border/60 focus:border-yellow-400"}`} autoFocus />
                    </div>
                    {erreurCompteur && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {erreurCompteur}</p>}
                  </div>
                </div>
                <button disabled={!numeroCompteur.trim()} onClick={validerCompteur} className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40" style={{ background: numeroCompteur.trim() ? "linear-gradient(135deg, #f59e0b, #f97316)" : undefined }}>
                  Continuer
                </button>
              </div>
            )}

            {/* ── ÉTAPE 3 : Montant */}
            {etape === "montant" && pays && (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl p-3 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-green-800 dark:text-green-300">Compteur validé</p>
                    <p className="text-xs text-green-700 dark:text-green-400">{numeroCompteur.trim().toUpperCase()} · {pays.operateur}</p>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Montant à recharger (F CFA)</label>
                    <div className="relative">
                      <Banknote className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input type="number" value={montant} onChange={e => { setMontant(e.target.value); setErreurMontant(""); }} placeholder="0" className={`w-full pl-10 pr-4 py-3 bg-muted/50 border rounded-xl text-lg font-bold outline-none transition-colors ${erreurMontant ? "border-red-400" : "border-border/60 focus:border-yellow-400"}`} min={500} autoFocus />
                    </div>
                    {erreurMontant && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {erreurMontant}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Montants rapides</p>
                    <div className="grid grid-cols-3 gap-2">
                      {montantsRapides.map(m => (
                        <button key={m} onClick={() => { setMontant(String(m)); setErreurMontant(""); }} className={`py-2 rounded-xl text-sm font-bold border transition-colors ${Number(montant) === m ? "bg-yellow-500 text-white border-yellow-500" : "bg-muted/50 border-border/60 hover:border-yellow-400 text-foreground"}`}>
                          {fmtNum(m)} F
                        </button>
                      ))}
                    </div>
                  </div>
                  {Number(montant) >= 500 && (
                    <div className="bg-muted/50 rounded-xl p-3 space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Montant</span><span className="font-bold">{fmtNum(Number(montant))} F</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Frais de service</span><span className="font-bold">{fmtNum(frais)} F</span></div>
                      <div className="border-t border-border pt-2 flex justify-between text-sm"><span className="font-bold">Total à payer</span><span className="font-black text-yellow-600">{fmtNum(total)} F</span></div>
                    </div>
                  )}
                </div>
                <button disabled={!montant || Number(montant) < 500} onClick={validerMontant} className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40" style={{ background: Number(montant) >= 500 ? "linear-gradient(135deg, #f59e0b, #f97316)" : undefined }}>
                  Continuer — {Number(montant) >= 500 ? `${fmtNum(total)} F` : ""}
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
                      <span className="text-muted-foreground flex items-center gap-2"><img src={pays.flagUrl} alt={pays.name} className="w-5 h-3 rounded-sm object-cover" /> Opérateur</span>
                      <span className="font-bold">{pays.operateur}</span>
                    </div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> Compteur</span><span className="font-mono font-bold">{numeroCompteur.trim().toUpperCase()}</span></div>
                    <div className="border-t border-border pt-3 space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Recharge</span><span className="font-bold">{fmtNum(Number(montant))} F</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Frais</span><span className="font-bold">{fmtNum(frais)} F</span></div>
                      <div className="flex justify-between font-black text-sm"><span>TOTAL</span><span className="text-yellow-600 text-base">{fmtNum(total)} F CFA</span></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-xl">
                  <Shield className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">Paiement sécurisé. Votre token sera affiché immédiatement après confirmation.</p>
                </div>
                <button onClick={lancerPaiement} className="w-full py-3.5 rounded-xl font-bold text-sm text-white" style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}>
                  <Zap className="inline w-4 h-4 mr-2" /> Payer {fmtNum(total)} F par Mobile Money
                </button>
                <button onClick={() => setEtape("montant")} className="w-full py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors">Modifier le montant</button>
              </div>
            )}

            {/* ── PAIEMENT EN COURS */}
            {etape === "paiement" && (
              <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-full border-2 border-yellow-200 border-t-yellow-500 animate-spin" />
                <div className="text-center">
                  <p className="font-bold text-foreground">Paiement en cours…</p>
                  <p className="text-sm text-muted-foreground mt-1">Confirmez la transaction sur votre téléphone</p>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Traitement en cours…</p>
              </div>
            )}

            {/* ── SUCCÈS */}
            {etape === "succes" && transaction && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-black text-foreground">Paiement réussi !</h2>
                  <p className="text-sm text-muted-foreground">Votre compteur a été rechargé</p>
                </div>
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2"><Receipt className="w-4 h-4 text-muted-foreground" /><p className="font-bold text-sm">Reçu de transaction</p></div>
                    <button onClick={() => downloadReceiptPDF(transaction)} className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white font-bold text-xs rounded-lg transition-colors">
                      <Download className="w-3.5 h-3.5" /> Télécharger PDF
                    </button>
                  </div>
                  <div className="p-4 space-y-2">
                    {[
                      ["Référence", transaction.reference],
                      ["Pays", transaction.pays.name],
                      ["Opérateur", transaction.pays.operateur],
                      ["Compteur", transaction.compteur],
                      ["Montant rechargé", `${fmtNum(transaction.montant)} F`],
                      ["Frais", `${fmtNum(transaction.frais)} F`],
                      ["Total payé", `${fmtNum(transaction.total)} F`],
                      ["Date", transaction.date],
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
                <button onClick={() => setEtape("confirmation")} className="px-6 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}>Réessayer</button>
              </div>
            )}
          </>
        )}

      </div>
    </AppLayout>
  );
}
