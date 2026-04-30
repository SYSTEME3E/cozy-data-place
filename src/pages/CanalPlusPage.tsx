/**
 * NEXORA — Paiement Canal+
 * Rechargement d'abonnement Canal+ pour BJ, TG, NE, SN, CI
 * Intégration Bizao (agrégateur Canal+ multi-pays)
 */

import { useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import {
  Tv2, ChevronDown, Search, ArrowLeft, CheckCircle2,
  AlertCircle, RefreshCw, X, Hash, Banknote, Receipt,
  ChevronRight, Info, Shield, Smartphone, Calendar,
  Clock, Star,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type Pays = {
  code: string;
  flag: string;
  name: string;
  devise: string;
};

type Formule = {
  id: string;
  nom: string;
  description: string;
  prixMensuel: number;
  populaire?: boolean;
  couleur: string;
};

type Duree = { mois: number; label: string; reduction?: string };

type Etape =
  | "choix_pays"
  | "saisie_abonne"
  | "verification"
  | "choix_formule"
  | "choix_duree"
  | "confirmation"
  | "paiement"
  | "succes"
  | "erreur";

type AbonneInfo = {
  nom: string;
  numeroAbonne: string;
  formuleActuelle: string;
  dateExpiration: string;
  pays: Pays;
};

type Transaction = {
  numeroAbonne: string;
  nomClient: string;
  formule: Formule;
  duree: Duree;
  montant: number;
  frais: number;
  total: number;
  reference: string;
  dateActivation: string;
  dateExpiration: string;
  pays: Pays;
};

// ─── Données ──────────────────────────────────────────────────────────────────

const PAYS_CANAL: Pays[] = [
  { code: "BJ", flag: "🇧🇯", name: "Bénin",          devise: "XOF" },
  { code: "TG", flag: "🇹🇬", name: "Togo",            devise: "XOF" },
  { code: "NE", flag: "🇳🇪", name: "Niger",           devise: "XOF" },
  { code: "SN", flag: "🇸🇳", name: "Sénégal",         devise: "XOF" },
  { code: "CI", flag: "🇨🇮", name: "Côte d'Ivoire",   devise: "XOF" },
];

const FORMULES_CANAL: Formule[] = [
  {
    id: "access",
    nom: "Access",
    description: "Les essentiels — Chaînes de base",
    prixMensuel: 4500,
    couleur: "from-blue-400 to-blue-600",
  },
  {
    id: "evasion",
    nom: "Évasion",
    description: "Divertissement complet",
    prixMensuel: 8000,
    populaire: true,
    couleur: "from-purple-500 to-indigo-600",
  },
  {
    id: "tout_canal",
    nom: "Tout Canal+",
    description: "Toutes les chaînes sans exception",
    prixMensuel: 15000,
    couleur: "from-yellow-500 to-orange-500",
  },
  {
    id: "canal_plus",
    nom: "Canal+",
    description: "Films, séries & sport premium",
    prixMensuel: 12000,
    couleur: "from-gray-700 to-gray-900",
  },
];

const DUREES: Duree[] = [
  { mois: 1,  label: "1 mois" },
  { mois: 3,  label: "3 mois", reduction: "-5%" },
  { mois: 6,  label: "6 mois", reduction: "-10%" },
  { mois: 12, label: "12 mois", reduction: "-15%" },
];

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
  return `CANAL-${Date.now().toString().slice(-8)}`;
}

function addMonths(date: Date, months: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function calcPrix(formule: Formule, duree: Duree): number {
  const reductions: Record<number, number> = { 1: 0, 3: 0.05, 6: 0.10, 12: 0.15 };
  const base = formule.prixMensuel * duree.mois;
  return Math.round(base * (1 - (reductions[duree.mois] ?? 0)));
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

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
            <span className="text-2xl">{selected.flag}</span>
            <div className="flex-1">
              <p className="font-bold text-sm">{selected.name}</p>
              <p className="text-xs text-muted-foreground">Canal+ {selected.devise}</p>
            </div>
          </>
        ) : (
          <span className="text-muted-foreground text-sm">Sélectionner le pays...</span>
        )}
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-xl">
          {PAYS_CANAL.map(p => (
            <button
              key={p.code}
              onClick={() => { onSelect(p); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors border-b border-border/40 last:border-0 text-left ${selected?.code === p.code ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
            >
              <span className="text-2xl">{p.flag}</span>
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

// ─── Page principale ───────────────────────────────────────────────────────────

export default function CanalPlusPage() {
  const [etape, setEtape] = useState<Etape>("choix_pays");
  const [pays, setPays] = useState<Pays | null>(null);
  const [numeroAbonne, setNumeroAbonne] = useState("");
  const [erreurAbonne, setErreurAbonne] = useState("");
  const [abonneInfo, setAbonneInfo] = useState<AbonneInfo | null>(null);
  const [formuleChoisie, setFormuleChoisie] = useState<Formule | null>(null);
  const [dureeChoisie, setDureeChoisie] = useState<Duree>(DUREES[0]);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [chargement, setChargement] = useState(false);
  const [messageErreur, setMessageErreur] = useState("");

  const montant = formuleChoisie ? calcPrix(formuleChoisie, dureeChoisie) : 0;
  const frais = calcFrais(montant);
  const total = montant + frais;

  // ── Vérification abonné ────────────────────────────────────────────────────
  const verifierAbonne = useCallback(async () => {
    const num = numeroAbonne.trim().replace(/\s/g, "");
    if (!/^\d{11,13}$/.test(num)) {
      setErreurAbonne("Le numéro d'abonné doit contenir 11 à 13 chiffres");
      return;
    }
    setErreurAbonne("");
    setChargement(true);
    setEtape("verification");

    // TODO: Appeler l'API Bizao pour vérifier l'abonné Canal+
    // POST https://api.bizao.com/canal/verify
    // Headers: { Authorization: "Bearer YOUR_TOKEN", "country-code": pays.code }
    // Body: { subscriber_number: num, operator: "canal_plus" }
    // Réponse: { success: true, customer_name: "Aminata Diallo", current_plan: "Access", expiry_date: "2024-05-01" }
    await new Promise(r => setTimeout(r, 1800));

    // Simulation
    setAbonneInfo({
      nom: "Aminata Diallo",
      numeroAbonne: num,
      formuleActuelle: "Access",
      dateExpiration: "30 avril 2026",
      pays: pays!,
    });
    setChargement(false);
    setEtape("choix_formule");
  }, [numeroAbonne, pays]);

  // ── Lancer paiement ────────────────────────────────────────────────────────
  const lancerPaiement = useCallback(async () => {
    if (!abonneInfo || !formuleChoisie) return;
    setChargement(true);
    setEtape("paiement");

    // TODO: Intégrer Kkiapay / Bizao paiement
    // 1. Ouvrir widget Kkiapay pour `total` FCFA
    // 2. Sur succès Kkiapay → POST https://api.bizao.com/canal/subscribe
    //    Body: { subscriber_number, plan_id: formuleChoisie.id, duration: dureeChoisie.mois,
    //            amount: montant (net), kkiapay_transaction_id }
    // 3. Réponse: { success: true, activation_date: "...", expiry_date: "..." }
    await new Promise(r => setTimeout(r, 2500));

    const dateExp = addMonths(new Date(), dureeChoisie.mois);
    setTransaction({
      numeroAbonne: abonneInfo.numeroAbonne,
      nomClient: abonneInfo.nom,
      formule: formuleChoisie,
      duree: dureeChoisie,
      montant,
      frais,
      total,
      reference: genRef(),
      dateActivation: new Date().toLocaleString("fr-FR"),
      dateExpiration: dateExp,
      pays: abonneInfo.pays,
    });
    setChargement(false);
    setEtape("succes");
  }, [abonneInfo, formuleChoisie, dureeChoisie, montant, frais, total]);

  // ── Reset ──────────────────────────────────────────────────────────────────
  const reset = () => {
    setEtape("choix_pays");
    setPays(null);
    setNumeroAbonne("");
    setErreurAbonne("");
    setAbonneInfo(null);
    setFormuleChoisie(null);
    setDureeChoisie(DUREES[0]);
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
          {!["choix_pays", "succes", "erreur", "verification"].includes(etape) && (
            <button
              onClick={() => {
                if (etape === "saisie_abonne") setEtape("choix_pays");
                else if (etape === "choix_formule") setEtape("saisie_abonne");
                else if (etape === "choix_duree") setEtape("choix_formule");
                else if (etape === "confirmation") setEtape("choix_duree");
              }}
              className="p-2 rounded-xl hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
              <Tv2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground">Paiement Canal+</h1>
              <p className="text-xs text-muted-foreground">Rechargement abonnement — 5 pays</p>
            </div>
          </div>
        </div>

        {/* Indicateur d'étapes */}
        {!["paiement", "succes", "erreur", "verification"].includes(etape) && (
          <div className="flex items-center gap-1">
            {["choix_pays", "saisie_abonne", "choix_formule", "choix_duree", "confirmation"].map((e, i) => (
              <div key={e} className="flex-1 h-1.5 rounded-full transition-all"
                style={{
                  background: ["choix_pays","saisie_abonne","choix_formule","choix_duree","confirmation"].indexOf(etape) >= i
                    ? "linear-gradient(90deg, #7c3aed, #4f46e5)"
                    : "hsl(var(--muted))"
                }}
              />
            ))}
          </div>
        )}

        {/* ── ÉTAPE 1 : Choix pays ────────────────────────────────────────── */}
        {etape === "choix_pays" && (
          <div className="space-y-5">
            <PaysSelector selected={pays} onSelect={p => { setPays(p); setNumeroAbonne(""); }} />

            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-3 flex gap-2">
              <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Votre abonnement Canal+ est renouvelé instantanément après paiement. Aucun code à saisir sur votre décodeur.
              </p>
            </div>

            <button
              disabled={!pays}
              onClick={() => setEtape("saisie_abonne")}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: pays ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : undefined }}
            >
              Continuer <ChevronRight className="inline w-4 h-4 ml-1" />
            </button>
          </div>
        )}

        {/* ── ÉTAPE 2 : Numéro abonné ─────────────────────────────────────── */}
        {etape === "saisie_abonne" && pays && (
          <div className="space-y-5">
            <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <span className="text-2xl">{pays.flag}</span>
                <div>
                  <p className="font-bold text-sm">{pays.name}</p>
                  <p className="text-xs text-muted-foreground">Canal+ — Abonnement</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Numéro d'abonné Canal+
                </label>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={numeroAbonne}
                    onChange={e => { setNumeroAbonne(e.target.value); setErreurAbonne(""); }}
                    placeholder="Ex: 00123456789"
                    className={`w-full pl-10 pr-4 py-3 bg-muted/50 border rounded-xl text-sm font-mono outline-none transition-colors ${
                      erreurAbonne ? "border-red-400" : "border-border/60 focus:border-purple-400"
                    }`}
                    type="tel"
                    maxLength={13}
                    autoFocus
                  />
                </div>
                {erreurAbonne && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {erreurAbonne}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Numéro à 11-13 chiffres figurant sur votre carte Canal+ ou décodeur
                </p>
              </div>
            </div>

            <button
              disabled={!numeroAbonne.trim()}
              onClick={verifierAbonne}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: numeroAbonne.trim() ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : undefined }}
            >
              Vérifier l'abonné
            </button>
          </div>
        )}

        {/* ── VÉRIFICATION EN COURS ───────────────────────────────────────── */}
        {etape === "verification" && (
          <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full border-2 border-purple-200 border-t-purple-500 animate-spin" />
            <div className="text-center">
              <p className="font-bold text-foreground">Vérification en cours…</p>
              <p className="text-sm text-muted-foreground mt-1">Nous vérifions votre numéro d'abonné Canal+</p>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 : Choix formule ──────────────────────────────────────── */}
        {etape === "choix_formule" && abonneInfo && (
          <div className="space-y-4">
            {/* Info abonné */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-green-800 dark:text-green-300">{abonneInfo.nom}</p>
                <p className="text-xs text-green-700 dark:text-green-400">
                  Abonné {abonneInfo.numeroAbonne} · Formule actuelle : {abonneInfo.formuleActuelle}
                </p>
              </div>
            </div>

            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Choisissez votre formule</p>

            <div className="space-y-3">
              {FORMULES_CANAL.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFormuleChoisie(f)}
                  className={`w-full text-left rounded-2xl border-2 overflow-hidden transition-all ${
                    formuleChoisie?.id === f.id
                      ? "border-purple-500 shadow-md shadow-purple-100 dark:shadow-purple-900/20"
                      : "border-border hover:border-purple-300"
                  }`}
                >
                  <div className={`h-1.5 w-full bg-gradient-to-r ${f.couleur}`} />
                  <div className="p-3 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.couleur} flex items-center justify-center`}>
                      <Tv2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-sm">{f.nom}</p>
                        {f.populaire && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                            <Star className="w-3 h-3" /> Populaire
                          </span>
                        )}
                        {abonneInfo.formuleActuelle === f.nom && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-green-100 text-green-700">Actuel</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{f.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm">{fmtNum(f.prixMensuel)} F</p>
                      <p className="text-xs text-muted-foreground">/ mois</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              disabled={!formuleChoisie}
              onClick={() => setEtape("choix_duree")}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: formuleChoisie ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : undefined }}
            >
              Choisir la durée <ChevronRight className="inline w-4 h-4 ml-1" />
            </button>
          </div>
        )}

        {/* ── ÉTAPE 4 : Durée ────────────────────────────────────────────── */}
        {etape === "choix_duree" && formuleChoisie && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${formuleChoisie.couleur} flex items-center justify-center`}>
                <Tv2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm">Canal+ {formuleChoisie.nom}</p>
                <p className="text-xs text-muted-foreground">{fmtNum(formuleChoisie.prixMensuel)} F / mois</p>
              </div>
            </div>

            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Durée d'abonnement</p>

            <div className="grid grid-cols-2 gap-3">
              {DUREES.map(d => {
                const prix = calcPrix(formuleChoisie, d);
                const selected = dureeChoisie.mois === d.mois;
                return (
                  <button
                    key={d.mois}
                    onClick={() => setDureeChoisie(d)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                        : "border-border hover:border-purple-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <p className="font-black text-sm">{d.label}</p>
                      {d.reduction && (
                        <span className="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-md">{d.reduction}</span>
                      )}
                    </div>
                    <p className="text-base font-black mt-1" style={{ color: selected ? "#7c3aed" : undefined }}>
                      {fmtNum(prix)} F
                    </p>
                    <p className="text-xs text-muted-foreground">{fmtNum(Math.round(prix / d.mois))} F/mois</p>
                  </button>
                );
              })}
            </div>

            {/* Récapitulatif */}
            <div className="bg-muted/50 rounded-xl p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Abonnement</span>
                <span className="font-bold">{fmtNum(montant)} F</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frais de service</span>
                <span className="font-bold">{fmtNum(frais)} F</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-sm">
                <span className="font-bold">Total</span>
                <span className="font-black text-purple-600">{fmtNum(total)} F</span>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Valide jusqu'au <span className="font-bold">{addMonths(new Date(), dureeChoisie.mois)}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setEtape("confirmation")}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
            >
              Confirmer — {fmtNum(total)} F <ChevronRight className="inline w-4 h-4 ml-1" />
            </button>
          </div>
        )}

        {/* ── ÉTAPE 5 : Confirmation ──────────────────────────────────────── */}
        {etape === "confirmation" && abonneInfo && formuleChoisie && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-muted/50 border-b border-border">
                <p className="font-bold text-sm">Récapitulatif</p>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><span>{abonneInfo.pays.flag}</span> Pays</span>
                  <span className="font-bold">{abonneInfo.pays.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> N° Abonné</span>
                  <span className="font-mono font-bold">{abonneInfo.numeroAbonne}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Client</span>
                  <span className="font-bold">{abonneInfo.nom}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Tv2 className="w-3.5 h-3.5" /> Formule</span>
                  <span className="font-bold">Canal+ {formuleChoisie.nom}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Durée</span>
                  <span className="font-bold">{dureeChoisie.label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Expire le</span>
                  <span className="font-bold">{addMonths(new Date(), dureeChoisie.mois)}</span>
                </div>
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Abonnement</span>
                    <span className="font-bold">{fmtNum(montant)} F</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Frais</span>
                    <span className="font-bold">{fmtNum(frais)} F</span>
                  </div>
                  <div className="flex justify-between font-black text-sm">
                    <span>TOTAL</span>
                    <span className="text-purple-600 text-base">{fmtNum(total)} F CFA</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-xl">
              <Shield className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Paiement sécurisé via Bizao. Votre abonnement Canal+ sera activé instantanément après confirmation du paiement.
              </p>
            </div>

            <button
              onClick={lancerPaiement}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
            >
              <Tv2 className="inline w-4 h-4 mr-2" />
              Payer {fmtNum(total)} F par Mobile Money
            </button>

            <button onClick={() => setEtape("choix_duree")} className="w-full py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors">
              Modifier
            </button>
          </div>
        )}

        {/* ── PAIEMENT EN COURS ───────────────────────────────────────────── */}
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

        {/* ── SUCCÈS ─────────────────────────────────────────────────────── */}
        {etape === "succes" && transaction && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-black text-foreground">Abonnement activé !</h2>
              <p className="text-sm text-muted-foreground">Profitez de vos programmes Canal+</p>
            </div>

            {/* Confirmation Canal+ */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-2xl p-5 text-center space-y-3">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${transaction.formule.couleur} flex items-center justify-center mx-auto`}>
                <Tv2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-black text-lg text-foreground">Canal+ {transaction.formule.nom}</p>
                <p className="text-sm text-muted-foreground">{transaction.duree.label}</p>
              </div>
              <div className="bg-white dark:bg-card rounded-xl p-3">
                <p className="text-xs text-muted-foreground">Votre abonnement est actif jusqu'au</p>
                <p className="text-base font-black text-purple-600 mt-1">{transaction.dateExpiration}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Aucun code à saisir — votre décodeur est déjà mis à jour
              </p>
            </div>

            {/* Reçu */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center gap-2">
                <Receipt className="w-4 h-4 text-muted-foreground" />
                <p className="font-bold text-sm">Reçu de transaction</p>
              </div>
              <div className="p-4 space-y-2">
                {[
                  ["Référence", transaction.reference],
                  ["Abonné", transaction.numeroAbonne],
                  ["Client", transaction.nomClient],
                  ["Formule", `Canal+ ${transaction.formule.nom}`],
                  ["Durée", transaction.duree.label],
                  ["Montant", `${fmtNum(transaction.montant)} F`],
                  ["Frais", `${fmtNum(transaction.frais)} F`],
                  ["Total payé", `${fmtNum(transaction.total)} F`],
                  ["Activation", transaction.dateActivation],
                  ["Expire le", transaction.dateExpiration],
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
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
            >
              Réessayer
            </button>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
