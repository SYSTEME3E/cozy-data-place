/**
 * NEXORA — Paiement Électricité
 * SBEE (BJ) · CEET (TG) · NIGELEC (NE) · SENELEC (SN) · CIE (CI)
 * Kkiapay pour le Bénin — Agrégateur (Bizao) pour les autres pays
 */

import { useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import {
  Zap, ChevronDown, Search, ArrowLeft, Copy, Share2,
  CheckCircle2, AlertCircle, Loader2, RefreshCw, X,
  Smartphone, Hash, Banknote, Receipt, ChevronRight,
  Info, Shield, Clock,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type Pays = {
  code: string;
  flag: string;
  name: string;
  operateur: string;
  operateurCode: string;
  compteurLabel: string;
  compteurFormat: string;         // regex string pour validation
  compteurPlaceholder: string;
  compteurExample: string;
  partenaire: "kkiapay" | "bizao";
};

type Etape = "choix_pays" | "saisie" | "verification" | "montant" | "confirmation" | "paiement" | "succes" | "erreur";

type ClientInfo = {
  nom: string;
  compteur: string;
  pays: Pays;
};

type Transaction = {
  token: string;
  montant: number;
  frais: number;
  total: number;
  reference: string;
  compteur: string;
  nomClient: string;
  pays: Pays;
  date: string;
};

// ─── Données ──────────────────────────────────────────────────────────────────

const PAYS_ELECTRIQUE: Pays[] = [
  {
    code: "BJ", flag: "🇧🇯", name: "Bénin", operateur: "SBEE",
    operateurCode: "sbee",
    compteurLabel: "Numéro de compteur SBEE",
    compteurFormat: "^[0-9A-Z]{12,14}$",
    compteurPlaceholder: "Ex: 04151234567AB",
    compteurExample: "04151234567AB",
    partenaire: "kkiapay",
  },
  {
    code: "TG", flag: "🇹🇬", name: "Togo", operateur: "CEET",
    operateurCode: "ceet",
    compteurLabel: "Numéro de compteur CEET",
    compteurFormat: "^[0-9]{11,13}$",
    compteurPlaceholder: "Ex: 12345678901",
    compteurExample: "12345678901",
    partenaire: "bizao",
  },
  {
    code: "NE", flag: "🇳🇪", name: "Niger", operateur: "NIGELEC",
    operateurCode: "nigelec",
    compteurLabel: "Numéro de compteur NIGELEC",
    compteurFormat: "^[0-9]{11,13}$",
    compteurPlaceholder: "Ex: 12345678901",
    compteurExample: "12345678901",
    partenaire: "bizao",
  },
  {
    code: "SN", flag: "🇸🇳", name: "Sénégal", operateur: "SENELEC",
    operateurCode: "senelec",
    compteurLabel: "Numéro de compteur SENELEC",
    compteurFormat: "^[0-9]{11,13}$",
    compteurPlaceholder: "Ex: 12345678901",
    compteurExample: "12345678901",
    partenaire: "bizao",
  },
  {
    code: "CI", flag: "🇨🇮", name: "Côte d'Ivoire", operateur: "CIE",
    operateurCode: "cie",
    compteurLabel: "Numéro de compteur CIE",
    compteurFormat: "^[0-9]{11,13}$",
    compteurPlaceholder: "Ex: 12345678901",
    compteurExample: "12345678901",
    partenaire: "bizao",
  },
];

// ─── Calcul frais ──────────────────────────────────────────────────────────────

function calcFrais(montant: number): number {
  if (montant < 500) return 0;
  if (montant === 500) return 50;
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

// ─── Sous-composants ──────────────────────────────────────────────────────────

function PaysSelector({ selected, onSelect }: { selected: Pays | null; onSelect: (p: Pays) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = PAYS_ELECTRIQUE.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.operateur.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        Pays & Opérateur
      </label>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-muted/50 border border-border/60 rounded-xl hover:border-border transition-colors text-left"
      >
        {selected ? (
          <>
            <span className="text-2xl">{selected.flag}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground">{selected.name}</p>
              <p className="text-xs text-muted-foreground">{selected.operateur} — Prépayé</p>
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              {selected.partenaire === "kkiapay" ? "Kkiapay" : "Bizao"}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground text-sm">Sélectionner le pays...</span>
        )}
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-xl">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher pays ou opérateur..."
                className="w-full pl-8 pr-3 py-2 bg-muted rounded-lg text-sm outline-none"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.map(p => (
              <button
                key={p.code}
                onClick={() => { onSelect(p); setOpen(false); setSearch(""); }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left border-b border-border/40 last:border-0 ${selected?.code === p.code ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
              >
                <span className="text-2xl">{p.flag}</span>
                <div className="flex-1">
                  <p className="font-bold text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.operateur}</p>
                </div>
                <span className="text-xs text-muted-foreground">{p.partenaire}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Affichage Token ───────────────────────────────────────────────────────────

function TokenDisplay({ token }: { token: string }) {
  const groupes = token.replace(/\s/g, "").match(/.{1,4}/g) || [];
  const formatted = groupes.join(" ");

  const copier = () => {
    navigator.clipboard.writeText(token.replace(/\s/g, ""));
    toast.success("Token copié !");
  };

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-200 dark:border-yellow-700 rounded-2xl p-5 text-center space-y-3">
      <div className="flex items-center justify-center gap-2">
        <Zap className="w-5 h-5 text-yellow-600" />
        <p className="text-sm font-bold text-yellow-700 dark:text-yellow-400">Token de recharge</p>
      </div>
      <p className="text-2xl font-black tracking-widest text-foreground font-mono select-all">
        {formatted}
      </p>
      <p className="text-xs text-muted-foreground">
        Saisissez ce code sur votre compteur pour créditer votre solde
      </p>
      <div className="flex gap-2 justify-center">
        <button
          onClick={copier}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold text-sm rounded-xl transition-colors"
        >
          <Copy className="w-4 h-4" /> Copier
        </button>
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: "Token électricité", text: `Mon code : ${formatted}` });
            } else {
              copier();
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 font-bold text-sm rounded-xl transition-colors border border-border"
        >
          <Share2 className="w-4 h-4" /> Partager
        </button>
      </div>
    </div>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────────

export default function ElectricitePage() {
  const [etape, setEtape] = useState<Etape>("choix_pays");
  const [pays, setPays] = useState<Pays | null>(null);
  const [numeroCompteur, setNumeroCompteur] = useState("");
  const [erreurCompteur, setErreurCompteur] = useState("");
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [montant, setMontant] = useState("");
  const [erreurMontant, setErreurMontant] = useState("");
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [chargement, setChargement] = useState(false);
  const [messageErreur, setMessageErreur] = useState("");

  const frais = calcFrais(Number(montant) || 0);
  const total = (Number(montant) || 0) + frais;
  const montantsRapides = [500, 1000, 2000, 5000, 10000, 20000];

  // ── Validation compteur ─────────────────────────────────────────────────────
  const validerCompteur = useCallback(async () => {
    if (!pays) return;
    const regex = new RegExp(pays.compteurFormat);
    if (!regex.test(numeroCompteur.trim().toUpperCase())) {
      setErreurCompteur(`Format invalide. Exemple : ${pays.compteurExample}`);
      return;
    }
    setErreurCompteur("");
    setChargement(true);
    setEtape("verification");

    // TODO: Appeler l'API de vérification du compteur
    // Pour Bénin (Kkiapay) : https://api.kkiapay.me/api/v1/sbee/verify
    // Pour autres pays (Bizao) : https://api.bizao.com/electricity/verify
    // Body: { meter_number: numeroCompteur, operator: pays.operateurCode }
    // Réponse attendue: { success: true, customer_name: "Koffi Mensah" }
    await new Promise(r => setTimeout(r, 1800)); // ← Remplacer par vraie API

    // Simulation succès
    setClientInfo({ nom: "Koffi Mensah", compteur: numeroCompteur.trim().toUpperCase(), pays: pays! });
    setChargement(false);
    setEtape("montant");
  }, [pays, numeroCompteur]);

  // ── Validation montant ──────────────────────────────────────────────────────
  const validerMontant = useCallback(() => {
    const m = Number(montant);
    if (!m || m < 500) {
      setErreurMontant("Le montant minimum est 500 F");
      return;
    }
    setErreurMontant("");
    setEtape("confirmation");
  }, [montant]);

  // ── Lancer le paiement ──────────────────────────────────────────────────────
  const lancerPaiement = useCallback(async () => {
    setChargement(true);
    setEtape("paiement");

    // TODO : Intégrer Kkiapay ici
    // 1. Ouvrir le widget Kkiapay pour encaisser `total` FCFA
    //    import { openKkiapayWidget } from 'kkiapay';
    //    openKkiapayWidget({ amount: total, api_key: 'VOTRE_CLE', sandbox: false });
    //
    // 2. Écouter l'événement de confirmation :
    //    addKkiapayListener('success', async (response) => {
    //      const { transactionId } = response;
    //      // 3. Appeler l'API de génération de token
    //      //    POST https://api.kkiapay.me/api/v1/sbee/recharge
    //      //    Body: { meter_number, amount: montant (net sans frais), transaction_id: transactionId }
    //      //    Réponse: { token: "12345678901234567890" }
    //    });

    await new Promise(r => setTimeout(r, 2500)); // ← Remplacer par vrai flux Kkiapay

    // Simulation token reçu
    const fakeToken = "12345678901234567890";
    setTransaction({
      token: fakeToken,
      montant: Number(montant),
      frais,
      total,
      reference: genRef(),
      compteur: clientInfo!.compteur,
      nomClient: clientInfo!.nom,
      pays: clientInfo!.pays,
      date: new Date().toLocaleString("fr-FR"),
    });
    setChargement(false);
    setEtape("succes");
  }, [montant, frais, total, clientInfo]);

  // ── Reset ───────────────────────────────────────────────────────────────────
  const reset = () => {
    setEtape("choix_pays");
    setPays(null);
    setNumeroCompteur("");
    setErreurCompteur("");
    setClientInfo(null);
    setMontant("");
    setErreurMontant("");
    setTransaction(null);
    setChargement(false);
    setMessageErreur("");
  };

  // ─── RENDU ──────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          {etape !== "choix_pays" && etape !== "succes" && (
            <button
              onClick={() => {
                if (etape === "saisie") setEtape("choix_pays");
                else if (etape === "montant") setEtape("saisie");
                else if (etape === "confirmation") setEtape("montant");
              }}
              className="p-2 rounded-xl hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground">Paiement Électricité</h1>
              <p className="text-xs text-muted-foreground">SBEE · CEET · NIGELEC · SENELEC · CIE</p>
            </div>
          </div>
        </div>

        {/* Indicateur d'étapes */}
        {!["paiement", "succes", "erreur", "verification"].includes(etape) && (
          <div className="flex items-center gap-1">
            {["choix_pays", "saisie", "montant", "confirmation"].map((e, i) => (
              <div key={e} className="flex items-center gap-1 flex-1">
                <div className={`flex-1 h-1.5 rounded-full transition-all ${
                  ["choix_pays", "saisie", "montant", "confirmation"].indexOf(etape) >= i
                    ? "bg-yellow-500" : "bg-muted"
                }`} />
              </div>
            ))}
          </div>
        )}

        {/* ── ÉTAPE 1 : Choix du pays ─────────────────────────────────────── */}
        {etape === "choix_pays" && (
          <div className="space-y-5">
            <PaysSelector selected={pays} onSelect={p => { setPays(p); setNumeroCompteur(""); }} />

            {pays && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {pays.partenaire === "kkiapay"
                    ? "Bénin — Kkiapay est partenaire officiel de la SBEE. Token généré instantanément."
                    : `${pays.name} — Paiement via Bizao, agrégateur officiel ${pays.operateur}.`
                  }
                </p>
              </div>
            )}

            <button
              disabled={!pays}
              onClick={() => setEtape("saisie")}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: pays ? "linear-gradient(135deg, #f59e0b, #f97316)" : undefined }}
            >
              Continuer <ChevronRight className="inline w-4 h-4 ml-1" />
            </button>
          </div>
        )}

        {/* ── ÉTAPE 2 : Saisie compteur ───────────────────────────────────── */}
        {etape === "saisie" && pays && (
          <div className="space-y-5">
            <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <span className="text-2xl">{pays.flag}</span>
                <div>
                  <p className="font-bold text-sm">{pays.name} — {pays.operateur}</p>
                  <p className="text-xs text-muted-foreground">Compteur prépayé</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {pays.compteurLabel}
                </label>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={numeroCompteur}
                    onChange={e => { setNumeroCompteur(e.target.value); setErreurCompteur(""); }}
                    placeholder={pays.compteurPlaceholder}
                    className={`w-full pl-10 pr-4 py-3 bg-muted/50 border rounded-xl text-sm font-mono outline-none transition-colors ${
                      erreurCompteur ? "border-red-400" : "border-border/60 focus:border-yellow-400"
                    }`}
                    maxLength={16}
                    autoFocus
                  />
                </div>
                {erreurCompteur && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {erreurCompteur}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Format attendu : <span className="font-mono font-bold">{pays.compteurExample}</span>
                </p>
              </div>
            </div>

            <button
              disabled={!numeroCompteur.trim()}
              onClick={validerCompteur}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: numeroCompteur.trim() ? "linear-gradient(135deg, #f59e0b, #f97316)" : undefined }}
            >
              Vérifier le compteur
            </button>
          </div>
        )}

        {/* ── VÉRIFICATION EN COURS ───────────────────────────────────────── */}
        {etape === "verification" && (
          <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full border-2 border-yellow-200 border-t-yellow-500 animate-spin" />
            <div className="text-center">
              <p className="font-bold text-foreground">Vérification en cours…</p>
              <p className="text-sm text-muted-foreground mt-1">Nous vérifions le numéro de compteur auprès de {pays?.operateur}</p>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 : Saisie montant ────────────────────────────────────── */}
        {etape === "montant" && clientInfo && (
          <div className="space-y-4">
            {/* Info client */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-green-800 dark:text-green-300">{clientInfo.nom}</p>
                <p className="text-xs text-green-700 dark:text-green-400">Compteur {clientInfo.compteur} · {clientInfo.pays.operateur}</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Montant à recharger (F CFA)
                </label>
                <div className="relative">
                  <Banknote className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="number"
                    value={montant}
                    onChange={e => { setMontant(e.target.value); setErreurMontant(""); }}
                    placeholder="0"
                    className={`w-full pl-10 pr-4 py-3 bg-muted/50 border rounded-xl text-lg font-bold outline-none transition-colors ${
                      erreurMontant ? "border-red-400" : "border-border/60 focus:border-yellow-400"
                    }`}
                    min={500}
                    autoFocus
                  />
                </div>
                {erreurMontant && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {erreurMontant}
                  </p>
                )}
              </div>

              {/* Montants rapides */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Montants rapides</p>
                <div className="grid grid-cols-3 gap-2">
                  {montantsRapides.map(m => (
                    <button
                      key={m}
                      onClick={() => { setMontant(String(m)); setErreurMontant(""); }}
                      className={`py-2 rounded-xl text-sm font-bold border transition-colors ${
                        Number(montant) === m
                          ? "bg-yellow-500 text-white border-yellow-500"
                          : "bg-muted/50 border-border/60 hover:border-yellow-400 text-foreground"
                      }`}
                    >
                      {fmtNum(m)} F
                    </button>
                  ))}
                </div>
              </div>

              {/* Récapitulatif frais */}
              {Number(montant) >= 500 && (
                <div className="bg-muted/50 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Montant</span>
                    <span className="font-bold">{fmtNum(Number(montant))} F</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Frais de service</span>
                    <span className="font-bold">{fmtNum(frais)} F</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between text-sm">
                    <span className="font-bold">Total à payer</span>
                    <span className="font-black text-yellow-600">{fmtNum(total)} F</span>
                  </div>
                </div>
              )}
            </div>

            <button
              disabled={!montant || Number(montant) < 500}
              onClick={validerMontant}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: Number(montant) >= 500 ? "linear-gradient(135deg, #f59e0b, #f97316)" : undefined }}
            >
              Continuer — {Number(montant) >= 500 ? `${fmtNum(total)} F` : ""}
            </button>
          </div>
        )}

        {/* ── ÉTAPE 4 : Confirmation ──────────────────────────────────────── */}
        {etape === "confirmation" && clientInfo && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-muted/50 border-b border-border">
                <p className="font-bold text-sm text-foreground">Récapitulatif de la transaction</p>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><span>{clientInfo.pays.flag}</span> Opérateur</span>
                  <span className="font-bold">{clientInfo.pays.operateur}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> Compteur</span>
                  <span className="font-mono font-bold">{clientInfo.compteur}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Client</span>
                  <span className="font-bold">{clientInfo.nom}</span>
                </div>
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Recharge</span>
                    <span className="font-bold">{fmtNum(Number(montant))} F</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Frais</span>
                    <span className="font-bold">{fmtNum(frais)} F</span>
                  </div>
                  <div className="flex justify-between text-sm font-black">
                    <span>TOTAL</span>
                    <span className="text-yellow-600 text-base">{fmtNum(total)} F CFA</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-xl">
              <Shield className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Paiement sécurisé via {clientInfo.pays.partenaire === "kkiapay" ? "Kkiapay" : "Bizao"}.
                Votre token sera affiché immédiatement après confirmation.
              </p>
            </div>

            <button
              onClick={lancerPaiement}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all"
              style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}
            >
              <Zap className="inline w-4 h-4 mr-2" />
              Payer {fmtNum(total)} F par Mobile Money
            </button>

            <button onClick={() => setEtape("montant")} className="w-full py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors">
              Modifier le montant
            </button>
          </div>
        )}

        {/* ── PAIEMENT EN COURS ───────────────────────────────────────────── */}
        {etape === "paiement" && (
          <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full border-2 border-yellow-200 border-t-yellow-500 animate-spin" />
            <div className="text-center">
              <p className="font-bold text-foreground">Paiement en cours…</p>
              <p className="text-sm text-muted-foreground mt-1">Confirmez la transaction sur votre téléphone</p>
            </div>
            <div className="flex flex-col gap-1 text-center">
              <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center"><Clock className="w-3.5 h-3.5" /> Activation en cours…</p>
            </div>
          </div>
        )}

        {/* ── SUCCÈS ─────────────────────────────────────────────────────── */}
        {etape === "succes" && transaction && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-black text-foreground">Paiement réussi !</h2>
              <p className="text-sm text-muted-foreground">Votre compteur a été rechargé</p>
            </div>

            <TokenDisplay token={transaction.token} />

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center gap-2">
                <Receipt className="w-4 h-4 text-muted-foreground" />
                <p className="font-bold text-sm">Reçu de transaction</p>
              </div>
              <div className="p-4 space-y-2">
                {[
                  ["Référence", transaction.reference],
                  ["Opérateur", transaction.pays.operateur],
                  ["Compteur", transaction.compteur],
                  ["Client", transaction.nomClient],
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

            <button
              onClick={reset}
              className="w-full py-3.5 rounded-xl font-bold text-sm border border-border hover:bg-muted transition-colors"
            >
              <RefreshCw className="inline w-4 h-4 mr-2" />
              Nouveau paiement
            </button>
          </div>
        )}

        {/* ── ERREUR ─────────────────────────────────────────────────────── */}
        {etape === "erreur" && (
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <X className="w-7 h-7 text-red-600" />
            </div>
            <div>
              <p className="font-bold text-foreground">Paiement échoué</p>
              <p className="text-sm text-muted-foreground mt-1">{messageErreur || "Une erreur est survenue. Réessayez ou contactez le support."}</p>
            </div>
            <button
              onClick={() => setEtape("confirmation")}
              className="px-6 py-2.5 rounded-xl font-bold text-sm text-white"
              style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}
            >
              Réessayer
            </button>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
