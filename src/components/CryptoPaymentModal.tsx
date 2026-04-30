/**
 * CryptoPaymentModal.tsx
 * Modal de paiement crypto réutilisable (USDT TRC-20 / BNB)
 * - Sélection du réseau
 * - Génération d'adresse via NOWPayments
 * - QR code + copier adresse
 * - Timer 10 minutes
 * - Polling statut toutes les 30 secondes
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Copy, Check, Clock, AlertTriangle, Loader2,
  CheckCircle2, XCircle, X, RefreshCw, ExternalLink,
} from "lucide-react";
import {
  createCryptoPayment, getPaymentStatus, isComplete, isFailed,
  CryptoCurrency, CRYPTO_NETWORKS, NowPayment, CryptoWallet,
} from "@/lib/cryptoPayment";

// ─── USDT TRC-20 Logo SVG ─────────────────────────────────────────────────────
function USDTLogo({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size}>
      <circle cx="16" cy="16" r="16" fill="#26A17B" />
      <path
        d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.127 0 1.053 3.309 1.924 7.709 2.126v7.608h3.913v-7.61c4.393-.202 7.694-1.073 7.694-2.124 0-1.052-3.301-1.923-7.694-2.126"
        fill="#fff"
      />
    </svg>
  );
}

// ─── BNB Logo SVG ─────────────────────────────────────────────────────────────
function BNBLogo({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size}>
      <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
      <path
        d="M12.116 14.404L16 10.52l3.886 3.886 2.26-2.26L16 6l-6.144 6.144 2.26 2.26zM6 16l2.26-2.26L10.52 16l-2.26 2.26L6 16zm6.116 1.596L16 21.48l3.886-3.886 2.26 2.259L16 26l-6.144-6.144-.003-.003 2.263-2.257zM21.48 16l2.26-2.26L26 16l-2.26 2.26L21.48 16zm-3.188-.002h.002L16 13.706l-1.773 1.773-.001.001-.228.228-.002.003.003-.003.228-.228L16 17.294l2.294-2.294-.002-.002z"
        fill="white"
      />
    </svg>
  );
}

function CryptoLogo({ currency, size = 32 }: { currency: CryptoCurrency; size?: number }) {
  return currency === "usdttrc20"
    ? <USDTLogo size={size} />
    : <BNBLogo size={size} />;
}

// ─── Timer ────────────────────────────────────────────────────────────────────
function useTimer(durationSec: number, onExpire: () => void) {
  const [left, setLeft] = useState(durationSec);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const deadline = Date.now() + durationSec * 1000;
    ref.current = setInterval(() => {
      const rem = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setLeft(rem);
      if (rem === 0) {
        clearInterval(ref.current!);
        onExpire();
      }
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationSec]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return { left, display: `${mm}:${ss}` };
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface CryptoPaymentModalProps {
  isOpen:      boolean;
  onClose:     () => void;
  onSuccess:   (paymentId: string) => void;
  wallets:     CryptoWallet[];
  orderId:     string;
  productName: string;
  /** Prix en USD (ou USDT) à facturer */
  priceUSD:    number;
}

type Step = "select" | "loading" | "waiting" | "success" | "failed" | "expired";

// ─── Composant ────────────────────────────────────────────────────────────────
export default function CryptoPaymentModal({
  isOpen, onClose, onSuccess,
  wallets, orderId, productName, priceUSD,
}: CryptoPaymentModalProps) {

  const [step,        setStep]        = useState<Step>("select");
  const [selected,    setSelected]    = useState<CryptoCurrency | null>(null);
  const [payment,     setPayment]     = useState<NowPayment | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [copied,      setCopied]      = useState(false);
  const [pollStatus,  setPollStatus]  = useState<string>("En attente du paiement…");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setStep("select");
      setSelected(null);
      setPayment(null);
      setError(null);
      setCopied(false);
    } else {
      stopPolling();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Polling status ─────────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPolling = useCallback((paymentId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const data = await getPaymentStatus(paymentId);
        const s = data.payment_status;
        if (s === "waiting")       setPollStatus("En attente de réception…");
        if (s === "confirming")    setPollStatus("Confirmation en cours…");
        if (s === "partially_paid") setPollStatus("Paiement partiel reçu…");
        if (isComplete(s)) {
          stopPolling();
          setStep("success");
          onSuccess(paymentId);
        }
        if (isFailed(s)) {
          stopPolling();
          setStep("failed");
        }
      } catch (_) { /* réseau — réessai prochain interval */ }
    }, 30_000); // toutes les 30s
  }, [stopPolling, onSuccess]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // ── Sélection réseau → créer paiement ─────────────────────────────────────
  const handleSelect = async (currency: CryptoCurrency) => {
    setSelected(currency);
    setStep("loading");
    setError(null);
    try {
      const wallet = wallets.find((w) => w.reseau === currency);
      const amount = wallet?.prix_usdt || priceUSD;

      const p = await createCryptoPayment({
        price_amount:      amount,
        price_currency:    "usd",
        pay_currency:      currency,
        order_id:          orderId,
        order_description: `Achat : ${productName}`,
      });
      setPayment(p);
      setStep("waiting");
      startPolling(p.payment_id);
    } catch (e: any) {
      setError(e.message || "Erreur de création du paiement.");
      setStep("select");
    }
  };

  // ── Copier adresse ─────────────────────────────────────────────────────────
  const copyAddress = () => {
    if (!payment?.pay_address) return;
    navigator.clipboard.writeText(payment.pay_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // ── Timer expire ───────────────────────────────────────────────────────────
  const onTimerExpire = useCallback(() => {
    stopPolling();
    setStep("expired");
  }, [stopPolling]);

  const { left: timerLeft, display: timerDisplay } =
    useTimer(step === "waiting" ? 600 : 0, onTimerExpire);

  if (!isOpen) return null;

  const netConf = selected ? CRYPTO_NETWORKS[selected] : null;

  // ── Fond overlay ───────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        style={{ maxHeight: "92vh", overflowY: "auto" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-black text-sm">
              ₿
            </div>
            <div>
              <h2 className="font-black text-gray-900 text-sm">Paiement Crypto</h2>
              <p className="text-xs text-gray-500">{productName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* ── ÉTAPE : sélection réseau ── */}
          {step === "select" && (
            <>
              <div className="text-center pb-1">
                <p className="font-bold text-gray-800 text-sm">Choisissez votre réseau crypto</p>
                <p className="text-xs text-gray-500 mt-1">Deux réseaux disponibles</p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                {wallets.map((w) => {
                  const conf = CRYPTO_NETWORKS[w.reseau];
                  return (
                    <button
                      key={w.reseau}
                      onClick={() => handleSelect(w.reseau)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-left"
                    >
                      <CryptoLogo currency={w.reseau} size={40} />
                      <div className="flex-1">
                        <p className="font-black text-gray-900 text-sm">{conf.label}</p>
                        <p className="text-xs text-gray-500">{conf.network}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-gray-900 text-sm">{w.prix_usdt} USDT</p>
                        <p className="text-xs text-gray-400">≈ Prix</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700">L'adresse de paiement expire après <strong>10 minutes</strong></p>
              </div>
            </>
          )}

          {/* ── ÉTAPE : chargement ── */}
          {step === "loading" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              <div className="text-center">
                <p className="font-bold text-gray-800 text-sm">Génération de l'adresse…</p>
                <p className="text-xs text-gray-500 mt-1">Connexion à NOWPayments</p>
              </div>
            </div>
          )}

          {/* ── ÉTAPE : attente paiement ── */}
          {step === "waiting" && payment && netConf && selected && (
            <>
              {/* Timer */}
              <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${
                timerLeft <= 60 ? "bg-red-50 border-red-200"
                : timerLeft <= 180 ? "bg-amber-50 border-amber-200"
                : "bg-blue-50 border-blue-200"
              }`}>
                <Clock className={`w-4 h-4 flex-shrink-0 ${
                  timerLeft <= 60 ? "text-red-500" : timerLeft <= 180 ? "text-amber-500" : "text-blue-500"
                }`} />
                <p className={`text-xs font-semibold flex-1 ${
                  timerLeft <= 60 ? "text-red-700" : timerLeft <= 180 ? "text-amber-700" : "text-blue-700"
                }`}>
                  Adresse expire dans{" "}
                  <span className="font-black tabular-nums">{timerDisplay}</span>
                  {timerLeft <= 60 && " — Dépêchez-vous !"}
                </p>
              </div>

              {/* Réseau info */}
              <div
                className="flex items-center gap-3 p-4 rounded-2xl border-2"
                style={{ borderColor: netConf.color + "40", backgroundColor: netConf.bgColor }}
              >
                <CryptoLogo currency={selected} size={36} />
                <div>
                  <p className="font-black text-sm" style={{ color: netConf.color }}>{netConf.label}</p>
                  <p className="text-xs text-gray-600">{netConf.network}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="font-black text-gray-900 text-base">{payment.pay_amount}</p>
                  <p className="text-xs text-gray-500">{payment.pay_currency.toUpperCase()}</p>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-3 bg-white border-2 border-gray-200 rounded-2xl shadow-sm">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(payment.pay_address)}&bgcolor=ffffff&color=000000`}
                    alt="QR Code adresse crypto"
                    width={160}
                    height={160}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Adresse */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Adresse de dépôt</p>
                <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-2xl">
                  <p className="flex-1 text-xs font-mono text-gray-800 break-all select-all leading-relaxed">
                    {payment.pay_address}
                  </p>
                  <button
                    onClick={copyAddress}
                    className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                    style={{ backgroundColor: copied ? "#dcfce7" : "#f0fdf4", color: copied ? "#16a34a" : "#4b5563" }}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                {copied && (
                  <p className="text-xs text-green-600 font-semibold text-center">✅ Adresse copiée !</p>
                )}
              </div>

              {/* Montant */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500 font-semibold">Montant exact à envoyer</p>
                  <p className="font-black text-gray-900">{payment.pay_amount} {payment.pay_currency.toUpperCase()}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">ID Commande</p>
                  <p className="text-xs font-mono text-gray-700">{orderId.slice(0, 12)}…</p>
                </div>
              </div>

              {/* Statut polling */}
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-2xl">
                <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                <p className="text-xs text-blue-700 font-medium">{pollStatus} (vérification auto toutes les 30s)</p>
              </div>

              {/* Avertissement réseau */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  <strong>Important :</strong> Envoyez uniquement via le réseau <strong>{netConf.label}</strong>.
                  Un mauvais réseau entraîne la perte des fonds.
                </p>
              </div>
            </>
          )}

          {/* ── ÉTAPE : succès ── */}
          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-lg">Paiement confirmé ! ✅</h3>
                <p className="text-sm text-gray-600 mt-1">Votre transaction crypto a été reçue avec succès.</p>
              </div>
              <div className="w-full p-4 bg-green-50 border border-green-200 rounded-2xl">
                <p className="text-sm text-green-700 font-semibold">Vous allez être redirigé vers votre produit…</p>
              </div>
            </div>
          )}

          {/* ── ÉTAPE : échec ── */}
          {step === "failed" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-lg">Paiement échoué</h3>
                <p className="text-sm text-gray-600 mt-1">La transaction a échoué ou a été annulée.</p>
              </div>
              <button
                onClick={() => { setStep("select"); setPayment(null); setError(null); }}
                className="w-full h-12 rounded-2xl bg-gray-100 text-gray-800 font-bold text-sm hover:bg-gray-200 transition-colors"
              >
                ↺ Réessayer
              </button>
            </div>
          )}

          {/* ── ÉTAPE : expiré ── */}
          {step === "expired" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
              <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="w-10 h-10 text-amber-500" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-lg">Adresse expirée</h3>
                <p className="text-sm text-gray-600 mt-1">Les 10 minutes sont écoulées. Générez une nouvelle adresse.</p>
              </div>
              <button
                onClick={() => { setStep("select"); setPayment(null); setError(null); }}
                className="w-full h-12 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors"
              >
                ↺ Nouvelle adresse
              </button>
            </div>
          )}
        </div>

        {/* ── Footer sécurité ── */}
        {(step === "select" || step === "waiting") && (
          <div className="px-5 pb-5">
            <p className="text-center text-xs text-gray-400 font-medium">
              🔒 Paiements sécurisés via{" "}
              <a href="https://nowpayments.io" target="_blank" rel="noopener noreferrer"
                className="text-gray-600 hover:underline inline-flex items-center gap-0.5">
                NOWPayments <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
