import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  ChevronDown, Phone, User, Search, Check, X, AlertCircle,
  Loader2, Globe, ShieldCheck, Download, ArrowLeft, Zap, BadgeCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const LOGO_URL = "https://i.postimg.cc/c1QgbZsG/ei_1773937801458_removebg_preview.png";

const COUNTRIES = [
  { code: "BJ", flag: "🇧🇯", name: "Bénin",          currency: "XOF", networks: ["MTN MoMo", "Moov Money"] },
  { code: "CI", flag: "🇨🇮", name: "Côte d'Ivoire",  currency: "XOF", networks: ["Orange Money", "MTN MoMo", "Wave", "Moov Money"] },
  { code: "TG", flag: "🇹🇬", name: "Togo",            currency: "XOF", networks: ["Flooz", "T-Money"] },
  { code: "SN", flag: "🇸🇳", name: "Sénégal",         currency: "XOF", networks: ["Orange Money", "Wave", "Free Money"] },
  { code: "NE", flag: "🇳🇪", name: "Niger",           currency: "XOF", networks: ["Airtel Money", "Moov Money"] },
  { code: "ML", flag: "🇲🇱", name: "Mali",            currency: "XOF", networks: ["Orange Money", "Moov Money", "Wave"] },
  { code: "BF", flag: "🇧🇫", name: "Burkina Faso",    currency: "XOF", networks: ["Orange Money", "Moov Money"] },
  { code: "GN", flag: "🇬🇳", name: "Guinée",          currency: "GNF", networks: ["Orange Money", "MTN MoMo"] },
  { code: "CM", flag: "🇨🇲", name: "Cameroun",        currency: "XAF", networks: ["MTN MoMo", "Orange Money"] },
  { code: "CD", flag: "🇨🇩", name: "RD Congo",        currency: "CDF", networks: ["Vodacom", "Airtel Money"] },
  { code: "GA", flag: "🇬🇦", name: "Gabon",           currency: "XAF", networks: ["Airtel Money", "MTN MoMo"] },
  { code: "CG", flag: "🇨🇬", name: "Congo",           currency: "XAF", networks: ["MTN MoMo", "Airtel Money"] },
  { code: "GH", flag: "🇬🇭", name: "Ghana",           currency: "GHS", networks: ["MTN MoMo", "Vodafone Cash", "AirtelTigo Money"] },
  { code: "NG", flag: "🇳🇬", name: "Nigéria",         currency: "NGN", networks: ["MTN MoMo", "Airtel Money", "Glo Pay"] },
  { code: "KE", flag: "🇰🇪", name: "Kenya",           currency: "KES", networks: ["M-Pesa", "Airtel Money"] },
  { code: "TZ", flag: "🇹🇿", name: "Tanzanie",        currency: "TZS", networks: ["M-Pesa", "Tigo Pesa", "Airtel Money"] },
  { code: "UG", flag: "🇺🇬", name: "Ouganda",         currency: "UGX", networks: ["MTN MoMo", "Airtel Money"] },
  { code: "RW", flag: "🇷🇼", name: "Rwanda",          currency: "RWF", networks: ["MTN MoMo", "Airtel Money"] },
  { code: "MA", flag: "🇲🇦", name: "Maroc",           currency: "MAD", networks: ["Orange Money", "Maroc Telecom"] },
  { code: "GM", flag: "🇬🇲", name: "Gambie",          currency: "GMD", networks: ["Africell Money", "QCell"] },
  { code: "SL", flag: "🇸🇱", name: "Sierra Leone",    currency: "SLL", networks: ["Orange Money", "Africell Money"] },
  { code: "LR", flag: "🇱🇷", name: "Liberia",         currency: "LRD", networks: ["MTN MoMo", "Lonestar Money"] },
  { code: "MZ", flag: "🇲🇿", name: "Mozambique",      currency: "MZN", networks: ["M-Pesa", "Airtel Money"] },
  { code: "ZM", flag: "🇿🇲", name: "Zambie",          currency: "ZMW", networks: ["MTN MoMo", "Airtel Money"] },
];

const fmtNum = (n: number, currency = "FCFA") =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " " + currency;

type PayLinkData = {
  id: string;
  nom_produit: string;
  montant: number;
  devise: string;
  description: string;
  image_url?: string;
  accept_mobile_money: boolean;
  accept_carte: boolean;
  statut: string;
  user_id: string;
};

function CountrySelector({ selected, onSelect }: {
  selected: typeof COUNTRIES[0] | null;
  onSelect: (c: typeof COUNTRIES[0]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl hover:border-violet-400 transition-colors text-left"
      >
        {selected ? (
          <>
            <span className="text-2xl">{selected.flag}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-white">{selected.name}</p>
              <p className="text-xs text-white/40 truncate">{selected.networks.join(" · ")}</p>
            </div>
          </>
        ) : (
          <span className="text-white/40 text-sm flex-1">Sélectionner votre pays...</span>
        )}
        <ChevronDown className="w-4 h-4 text-white/40" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un pays..."
                className="w-full pl-9 pr-3 py-2 bg-white/5 rounded-xl text-sm text-white placeholder:text-white/30 outline-none"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map(c => (
              <button
                key={c.code}
                type="button"
                onClick={() => { onSelect(c); setOpen(false); setSearch(""); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
              >
                <span className="text-xl">{c.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-white">{c.name}</p>
                  <p className="text-xs text-white/40 truncate">{c.networks.join(" · ")}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function generateReceipt(data: {
  nomProduit: string;
  montant: number;
  devise: string;
  clientNom: string;
  telephone: string;
  pays: string;
  paysFlag: string;
  reseau: string;
  reference: string;
}) {
  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/><title>Reçu ${data.reference}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Segoe UI',sans-serif;background:#f8fafc;color:#1e293b;}
.page{max-width:640px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.12);}
.header{background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:36px 40px;display:flex;align-items:center;justify-content:space-between;}
.logo-area{display:flex;align-items:center;gap:14px;}
.logo-area img{width:52px;height:52px;object-fit:contain;}
.brand h1{font-size:22px;font-weight:900;letter-spacing:3px;color:#fff;}
.brand p{font-size:11px;color:rgba(255,255,255,.45);margin-top:2px;}
.badge{background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:8px;padding:8px 18px;font-size:12px;font-weight:700;}
.body{padding:40px;}
.amount-box{background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:2px solid #7c3aed;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;}
.amount-box .amount{font-size:36px;font-weight:900;color:#7c3aed;}
.success-badge{display:inline-block;background:#dcfce7;color:#16a34a;padding:6px 20px;border-radius:999px;font-weight:700;font-size:12px;margin-top:10px;}
.section-title{font-size:10px;font-weight:700;letter-spacing:2px;color:#94a3b8;text-transform:uppercase;margin-bottom:12px;}
.row{display:flex;justify-content:space-between;padding:11px 0;border-bottom:1px dashed #e2e8f0;}
.row .label{color:#64748b;font-size:13px;}
.row .value{font-weight:600;color:#1e293b;font-size:13px;}
.footer{background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;}
.footer p{font-size:11px;color:#94a3b8;line-height:1.8;}
@media print{body{background:#fff;}.page{box-shadow:none;margin:0;}}
</style></head><body>
<div class="page">
  <div class="header">
    <div class="logo-area">
      <img src="${LOGO_URL}" alt="Logo"/>
      <div class="brand"><h1>NEXORA</h1><p>PAYLINK</p></div>
    </div>
    <div class="badge">REÇU DE PAIEMENT</div>
  </div>
  <div class="body">
    <div class="amount-box">
      <p style="color:#64748b;font-size:12px;margin-bottom:6px">Montant payé</p>
      <div class="amount">${fmtNum(data.montant, data.devise)}</div>
      <div class="success-badge">✓ Paiement confirmé</div>
    </div>
    <div class="section-title">Produit</div>
    <div class="row"><span class="label">Nom du produit</span><span class="value">${data.nomProduit}</span></div>
    <div class="row"><span class="label">Référence</span><span class="value" style="font-family:monospace;font-size:11px">${data.reference}</span></div>
    <div class="row"><span class="label">Date</span><span class="value">${new Date().toLocaleString("fr-FR")}</span></div>
    <div class="section-title" style="margin-top:20px">Informations client</div>
    <div class="row"><span class="label">Nom</span><span class="value">${data.clientNom}</span></div>
    <div class="row"><span class="label">Pays</span><span class="value">${data.paysFlag} ${data.pays}</span></div>
    <div class="row"><span class="label">Réseau</span><span class="value">${data.reseau}</span></div>
    <div class="row"><span class="label">Téléphone</span><span class="value">${data.telephone}</span></div>
  </div>
  <div class="footer">
    <p>Reçu généré par <strong style="color:#7c3aed">NEXORA PAYLINK</strong><br/>
    Powered by GeniusPay · support@nexora.africa<br/>
    © ${new Date().getFullYear()} NEXORA — Tous droits réservés</p>
  </div>
</div></body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `Recu-${data.reference}.html`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export default function PayLinkCheckoutPage() {
  const { paylinkSlug: slug } = useParams<{ paylinkSlug: string }>();
  const [searchParams] = useSearchParams();

  const [paylink, setPaylink] = useState<PayLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Form
  const [nomClient, setNomClient] = useState("");
  const [pays, setPays] = useState<typeof COUNTRIES[0] | null>(null);
  const [reseau, setReseau] = useState("");
  const [telephone, setTelephone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"mobile_money" | "carte">("mobile_money");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Étapes
  const [step, setStep] = useState<"form" | "processing" | "success" | "failed">("form");
  const [paymentRef, setPaymentRef] = useState<string>("");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayLink = async () => {
      if (!slug) { setNotFound(true); setLoading(false); return; }
      const { data, error } = await supabase
        .from("nexora_paylinks" as any)
        .select("*")
        .eq("slug", slug)
        .eq("statut", "actif")
        .maybeSingle();
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setPaylink(data as PayLinkData);
      setPaymentMethod((data as any).accept_mobile_money ? "mobile_money" : "carte");
      setLoading(false);
    };
    fetchPayLink();
  }, [slug]);

  // ── Gérer le retour GeniusPay (success_url / error_url) ─────────
  useEffect(() => {
    const status = searchParams.get("status");
    const ref    = searchParams.get("ref");
    if (!status) return;

    if (ref) setPaymentRef(ref);

    if (status === "success") {
      // Mettre à jour le statut en base
      if (ref) {
        supabase
          .from("nexora_paylink_payments" as any)
          .update({ statut: "success" })
          .eq("reference", ref)
          .then(() => {});
        // Marquer la commande comme payée si ref correspond à un order_id
        supabase
          .from("commandes" as any)
          .update({ statut: "payee", paiement_effectue: true })
          .eq("id", ref)
          .then(() => {});
      }
      setStep("success");
    } else if (status === "failed") {
      if (ref) {
        supabase
          .from("nexora_paylink_payments" as any)
          .update({ statut: "failed" })
          .eq("reference", ref)
          .then(() => {});
      }
      setStep("failed");
    }
  }, [searchParams]);

  const valid =
    nomClient.trim().length >= 2 &&
    telephone.length >= 8 &&
    (paymentMethod !== "mobile_money" || (pays !== null && reseau !== ""));

  const handleSubmit = async () => {
    if (!paylink || !valid) return;
    setSubmitting(true);
    setError(null);

    try {
      const ref = `PLK-${Date.now().toString().slice(-8).toUpperCase()}`;
      setPaymentRef(ref);

      // Enregistrer la transaction en base (non bloquant — continue même si erreur)
      supabase
        .from("nexora_paylink_payments" as any)
        .insert({
          paylink_id: paylink.id,
          client_nom: nomClient.trim(),
          client_telephone: telephone.trim(),
          pays: pays?.name ?? "—",
          pays_flag: pays?.flag ?? "",
          reseau: paymentMethod === "mobile_money" ? reseau : "Carte bancaire",
          montant: paylink.montant,
          devise: paylink.devise,
          statut: "pending",
          reference: ref,
          payment_method: paymentMethod,
        })
        .then(({ error: dbErr }) => {
          if (dbErr) console.warn("⚠️ Insert paylink_payments non bloquant :", dbErr.message);
        });

      // Appel API GeniusPay via la fonction existante geniuspay-payment
      const { data: payData, error: fnErr } = await supabase.functions.invoke("geniuspay-payment", {
        body: {
          type: "paylink",
          paylink_id: paylink.id,
          amount: paylink.montant,
          currency: paylink.devise,
          payment_method: paymentMethod === "mobile_money" ? reseau : undefined,
          pays: pays?.code,
          customer: {
            name: nomClient.trim(),
            phone: telephone.trim(),
          },
          reference: ref,
          metadata: {
            slug,
            paylink_id: paylink.id,
            description: paylink.nom_produit,
          },
        },
      });

      if (fnErr || !payData?.success) {
        // Afficher l'erreur réelle
        const errMsg = payData?.error ?? fnErr?.message ?? "Erreur de paiement. Veuillez réessayer.";
        setError(errMsg);
        await supabase
          .from("nexora_paylink_payments" as any)
          .update({ statut: "failed", error_message: errMsg })
          .eq("reference", ref);
        setStep("failed");
        return;
      }

      const redirectUrl = payData.checkout_url ?? payData.payment_url ?? null;
      if (redirectUrl) {
        setCheckoutUrl(redirectUrl);
        setStep("processing");
        window.location.href = redirectUrl; // Redirection directe vers GeniusPay
      } else {
        setError("Impossible d'obtenir le lien de paiement.");
        setStep("failed");
      }
    } catch (err: any) {
      const errMsg = err?.message ?? "Erreur inattendue. Veuillez réessayer.";
      setError(errMsg);
      setStep("failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        <p className="text-white/60 text-sm">Chargement...</p>
      </div>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
          <X className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-white font-black text-2xl">Lien introuvable</h1>
        <p className="text-white/50 text-sm">Ce lien de paiement n'existe pas ou a été désactivé.</p>
      </div>
    </div>
  );

  // ── Écran SUCCESS ──────────────────────────────────────────────
  if (step === "success") return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-4">
      <style>{`
        @keyframes confettiDrop { 0%{transform:translateY(-20px);opacity:0} 100%{transform:translateY(0);opacity:1} }
        @keyframes pulse-glow { 0%,100%{box-shadow:0 0 30px rgba(16,185,129,0.3)} 50%{box-shadow:0 0 60px rgba(16,185,129,0.6)} }
        .pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .confetti { animation: confettiDrop 0.6s ease-out forwards; }
      `}</style>
      <div className="w-full max-w-sm bg-[#111] rounded-3xl overflow-hidden shadow-2xl border border-white/5">
        <div className="flex flex-col items-center py-10 px-6 space-y-5">
          <div className="w-24 h-24 rounded-full bg-emerald-500/10 pulse-glow flex items-center justify-center confetti">
            <Check className="w-12 h-12 text-emerald-400" strokeWidth={3} />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-white font-black text-2xl">Paiement réussi !</h2>
            <p className="text-white/50 text-sm">Votre paiement a été confirmé avec succès</p>
          </div>
          <div className="w-full bg-white/5 rounded-2xl p-4 space-y-2 text-sm">
            {[
              { label: "Produit", value: paylink!.nom_produit },
              { label: "Montant", value: fmtNum(paylink!.montant, paylink!.devise) },
              { label: "Client", value: nomClient },
              { label: "Référence", value: paymentRef, mono: true },
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
                <span className="text-white/40 text-xs">{label}</span>
                <span className={`text-white font-semibold text-xs ${mono ? "font-mono" : ""}`}>{value}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => generateReceipt({
              nomProduit: paylink!.nom_produit,
              montant: paylink!.montant,
              devise: paylink!.devise,
              clientNom: nomClient,
              telephone,
              pays: pays?.name ?? "—",
              paysFlag: pays?.flag ?? "",
              reseau: paymentMethod === "mobile_money" ? reseau : "Carte bancaire",
              reference: paymentRef,
            })}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Télécharger le reçu
          </button>
          <p className="text-white/30 text-xs text-center">
            Transaction effectuée via <span className="text-violet-400 font-semibold">Nexora PayLink</span>
          </p>
        </div>
      </div>
    </div>
  );

  // ── Écran FAILED ──────────────────────────────────────────────
  if (step === "failed") return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#111] rounded-3xl overflow-hidden shadow-2xl border border-white/5">
        <div className="flex flex-col items-center py-10 px-6 space-y-5">
          <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center">
            <X className="w-12 h-12 text-red-400" strokeWidth={3} />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-white font-black text-2xl">Paiement échoué</h2>
            <p className="text-white/50 text-sm">
              {error ?? "Une erreur s'est produite lors du paiement."}
            </p>
          </div>
          {paymentRef && (
            <div className="w-full bg-white/5 rounded-2xl p-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-xs">Référence</span>
                <span className="text-white font-mono text-xs">{paymentRef}</span>
              </div>
            </div>
          )}
          <button
            onClick={() => { setStep("form"); setError(null); }}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            Réessayer le paiement
          </button>
          <p className="text-white/30 text-xs text-center">
            Si le problème persiste, contactez le vendeur.
          </p>
        </div>
      </div>
    </div>
  );

  // ── Écran PROCESSING ──────────────────────────────────────────
  if (step === "processing") return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#111] rounded-3xl p-8 border border-white/5 text-center space-y-5">
        <Loader2 className="w-12 h-12 animate-spin text-violet-400 mx-auto" />
        <div className="space-y-2">
          <h2 className="text-white font-black text-xl">Paiement en cours...</h2>
          <p className="text-white/50 text-sm">Completez le paiement sur la page GeniusPay.</p>
        </div>
        {checkoutUrl && (
          <a href={checkoutUrl} target="_blank" rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-violet-500 hover:bg-violet-600 text-white font-black rounded-2xl transition-colors">
            Ouvrir GeniusPay
          </a>
        )}
        <button
          onClick={() => setStep("success")}
          className="w-full py-2.5 border border-white/10 text-white/50 font-semibold rounded-2xl text-sm hover:bg-white/5 transition-colors"
        >
          J'ai payé ✓
        </button>
      </div>
    </div>
  );

  // ── Écran FORM ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col">
      <style>{`
        @keyframes fadeInUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
        .fade-in-up-delay { animation: fadeInUp 0.5s ease-out 0.15s both; }
        .fade-in-up-delay2 { animation: fadeInUp 0.5s ease-out 0.3s both; }
      `}</style>

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <img src={LOGO_URL} alt="Nexora" className="w-7 h-7 object-contain" />
          <span className="text-white font-black text-sm tracking-widest">NEXORA</span>
          <span className="text-violet-400/60 text-[10px] font-bold tracking-[2px]">PAYLINK</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] text-white/50 font-semibold">Sécurisé</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-sm mx-auto px-4 py-6 space-y-5">

          {/* Produit */}
          <div className="fade-in-up bg-gradient-to-br from-violet-900/50 to-indigo-900/50 border border-violet-500/20 rounded-2xl p-5 space-y-3">
            {paylink!.image_url && (
              <div className="w-full h-44 rounded-xl overflow-hidden border border-white/10">
                <img src={paylink!.image_url} alt={paylink!.nom_produit} className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <p className="text-violet-300/60 text-xs font-semibold uppercase tracking-wider mb-1">Produit</p>
              <h1 className="text-white font-black text-xl leading-tight">{paylink!.nom_produit}</h1>
              {paylink!.description && (
                <div
                  className="text-white/50 text-sm mt-2 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: paylink!.description }}
                />
              )}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <p className="text-white/50 text-sm">Montant à payer</p>
              <p className="text-violet-300 font-black text-2xl">
                {fmtNum(paylink!.montant, paylink!.devise)}
              </p>
            </div>
          </div>

          {/* Moyen de paiement */}
          {paylink!.accept_mobile_money && paylink!.accept_carte && (
            <div className="fade-in-up-delay space-y-2">
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">Moyen de paiement</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "mobile_money", label: "Mobile Money", icon: "📱" },
                  { key: "carte", label: "Carte bancaire", icon: "💳" },
                ].map(({ key, label, icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPaymentMethod(key as any)}
                    className={`flex items-center gap-2.5 p-3.5 rounded-2xl border-2 transition-all ${paymentMethod === key ? "border-violet-500 bg-violet-500/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}
                  >
                    <span className="text-xl">{icon}</span>
                    <span className="text-white font-semibold text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Formulaire */}
          <div className="fade-in-up-delay2 space-y-4">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">Vos informations</p>

            <div className="space-y-2">
              <label className="text-white/60 text-xs font-semibold">Nom complet *</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  value={nomClient}
                  onChange={e => setNomClient(e.target.value)}
                  placeholder="Jean Kouassi"
                  className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/20 outline-none focus:border-violet-400 transition-colors text-sm font-semibold"
                />
              </div>
            </div>

            {paymentMethod === "mobile_money" && (
              <>
                <div className="space-y-2">
                  <label className="text-white/60 text-xs font-semibold">Votre pays *</label>
                  <CountrySelector selected={pays} onSelect={p => { setPays(p); setReseau(p.networks[0]); }} />
                </div>

                {pays && (
                  <div className="space-y-2">
                    <label className="text-white/60 text-xs font-semibold">Réseau Mobile Money *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {pays.networks.map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setReseau(n)}
                          className={`py-3 px-3 rounded-2xl text-sm font-bold border-2 transition-all ${reseau === n ? "border-violet-500 bg-violet-500/10 text-violet-300" : "border-white/10 bg-white/5 text-white/60 hover:border-white/20"}`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <label className="text-white/60 text-xs font-semibold">
                {paymentMethod === "mobile_money" ? "Numéro Mobile Money *" : "Téléphone *"}
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="tel"
                  value={telephone}
                  onChange={e => setTelephone(e.target.value)}
                  placeholder="+229 97 00 00 00"
                  className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/20 outline-none focus:border-violet-400 transition-colors text-sm font-semibold"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Récap */}
            <div className="bg-white/3 border border-white/5 rounded-2xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-white/40">
                <span>Produit</span>
                <span className="text-white font-semibold truncate ml-4 max-w-[160px] text-right">{paylink!.nom_produit}</span>
              </div>
              <div className="flex justify-between text-white/40">
                <span>Montant</span>
                <span className="text-violet-300 font-black">{fmtNum(paylink!.montant, paylink!.devise)}</span>
              </div>
              {paymentMethod === "mobile_money" && reseau && (
                <div className="flex justify-between text-white/40">
                  <span>Réseau</span>
                  <span className="text-white font-semibold">{reseau}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!valid || submitting}
              className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-base shadow-lg shadow-violet-500/30 hover:scale-[1.02] active:scale-[0.99]"
            >
              {submitting
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Traitement...</>
                : <><Zap className="w-5 h-5" /> Payer {fmtNum(paylink!.montant, paylink!.devise)}</>
              }
            </button>

            {/* Sécurité */}
            <div className="flex items-center justify-center gap-4 pt-2">
              {[
                { icon: ShieldCheck, text: "Paiement sécurisé" },
                { icon: BadgeCheck, text: "Powered by GeniusPay" },
                { icon: Globe, text: "24 pays africains" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1 text-white/25 text-[10px]">
                  <Icon className="w-3 h-3" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
