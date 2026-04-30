/**
 * CryptoWalletConfig.tsx
 * Composant de configuration des wallets crypto pour les vendeurs.
 * Permet d'activer USDT-TRC20 et/ou BNB avec l'adresse wallet et le prix.
 * Stocké dans moyens_paiement[] avec reseau="USDT-TRC20" ou "BNB"
 */

import { useState, useEffect } from "react";
import { Check, AlertTriangle, Info, Wallet } from "lucide-react";

// ─── Logo USDT TRC-20 ─────────────────────────────────────────────────────────
function USDTLogo({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size}>
      <circle cx="16" cy="16" r="16" fill="#26A17B" />
      <path d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.127 0 1.053 3.309 1.924 7.709 2.126v7.608h3.913v-7.61c4.393-.202 7.694-1.073 7.694-2.124 0-1.052-3.301-1.923-7.694-2.126" fill="#fff" />
    </svg>
  );
}

// ─── Logo BNB ─────────────────────────────────────────────────────────────────
function BNBLogo({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size}>
      <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
      <path d="M12.116 14.404L16 10.52l3.886 3.886 2.26-2.26L16 6l-6.144 6.144 2.26 2.26zM6 16l2.26-2.26L10.52 16l-2.26 2.26L6 16zm6.116 1.596L16 21.48l3.886-3.886 2.26 2.259L16 26l-6.144-6.144-.003-.003 2.263-2.257zM21.48 16l2.26-2.26L26 16l-2.26 2.26L21.48 16zm-3.188-.002h.002L16 13.706l-1.773 1.773-.001.001-.228.228-.002.003.003-.003.228-.228L16 17.294l2.294-2.294-.002-.002z" fill="white" />
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface CryptoEntry {
  enabled:  boolean;
  address:  string;
  priceUSD: string; // stringifié pour l'input
}

interface CryptoConfig {
  usdt: CryptoEntry;
  bnb:  CryptoEntry;
}

interface PaymentMethod {
  reseau:          string;
  numero:          string;
  nom_titulaire:   string;
  instructions?:   string;
}

interface CryptoWalletConfigProps {
  /** Valeur courante de moyens_paiement (toutes entrées confondues) */
  moyensPaiement: PaymentMethod[];
  /** Appelée quand la config change, retourne le nouveau tableau moyens_paiement */
  onChange: (newMoyens: PaymentMethod[]) => void;
  /** Classe css conteneur optionnelle */
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function loadConfig(moyens: PaymentMethod[]): CryptoConfig {
  const usdt = moyens.find((m) => m.reseau === "USDT-TRC20");
  const bnb  = moyens.find((m) => m.reseau === "BNB");
  return {
    usdt: {
      enabled:  !!usdt,
      address:  usdt?.numero || "",
      priceUSD: usdt?.instructions || "",
    },
    bnb: {
      enabled:  !!bnb,
      address:  bnb?.numero || "",
      priceUSD: bnb?.instructions || "",
    },
  };
}

function buildMoyens(base: PaymentMethod[], config: CryptoConfig): PaymentMethod[] {
  // Supprimer les anciens entrées crypto
  const nonCrypto = base.filter(
    (m) => m.reseau !== "USDT-TRC20" && m.reseau !== "BNB"
  );
  const result = [...nonCrypto];

  if (config.usdt.enabled && config.usdt.address.trim()) {
    result.push({
      reseau:        "USDT-TRC20",
      numero:        config.usdt.address.trim(),
      nom_titulaire: "CRYPTO",
      instructions:  config.usdt.priceUSD.trim(),
    });
  }
  if (config.bnb.enabled && config.bnb.address.trim()) {
    result.push({
      reseau:        "BNB",
      numero:        config.bnb.address.trim(),
      nom_titulaire: "CRYPTO",
      instructions:  config.bnb.priceUSD.trim(),
    });
  }
  return result;
}

// ─── Composant ────────────────────────────────────────────────────────────────
export default function CryptoWalletConfig({
  moyensPaiement, onChange, className = "",
}: CryptoWalletConfigProps) {
  const [config, setConfig] = useState<CryptoConfig>(() =>
    loadConfig(moyensPaiement)
  );

  // Sync si moyensPaiement change depuis l'extérieur
  useEffect(() => {
    setConfig(loadConfig(moyensPaiement));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (next: CryptoConfig) => {
    setConfig(next);
    onChange(buildMoyens(moyensPaiement, next));
  };

  const toggleNetwork = (net: "usdt" | "bnb") => {
    update({ ...config, [net]: { ...config[net], enabled: !config[net].enabled } });
  };

  const setField = (
    net: "usdt" | "bnb",
    field: "address" | "priceUSD",
    val: string
  ) => {
    update({ ...config, [net]: { ...config[net], [field]: val } });
  };

  const anyCryptoEnabled = config.usdt.enabled || config.bnb.enabled;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Titre section */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-black text-sm">
          ₿
        </div>
        <div>
          <p className="font-black text-white text-sm">Paiement Crypto</p>
          <p className="text-xs text-slate-500">USDT TRC-20 & BNB acceptés</p>
        </div>
      </div>

      {/* Info NOWPayments */}
      <div className="flex items-start gap-2 p-3 bg-blue-950/30 border border-blue-700/30 rounded-2xl">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-300">
          Les paiements sont traités via <strong>NOWPayments</strong>. Le montant
          est défini en <strong>USD (≈ USDT)</strong>. Activez les réseaux souhaités
          et saisissez votre adresse wallet.
        </p>
      </div>

      {/* ── USDT TRC-20 ── */}
      <NetworkCard
        logo={<USDTLogo size={32} />}
        label="USDT TRC-20"
        network="Réseau TRON"
        color="#26A17B"
        enabled={config.usdt.enabled}
        address={config.usdt.address}
        priceUSD={config.usdt.priceUSD}
        onToggle={() => toggleNetwork("usdt")}
        onAddress={(v) => setField("usdt", "address", v)}
        onPrice={(v) => setField("usdt", "priceUSD", v)}
        placeholder="TXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        hint="Adresse commençant par T (TRON)"
      />

      {/* ── BNB ── */}
      <NetworkCard
        logo={<BNBLogo size={32} />}
        label="BNB"
        network="BNB Smart Chain"
        color="#F3BA2F"
        enabled={config.bnb.enabled}
        address={config.bnb.address}
        priceUSD={config.bnb.priceUSD}
        onToggle={() => toggleNetwork("bnb")}
        onAddress={(v) => setField("bnb", "address", v)}
        onPrice={(v) => setField("bnb", "priceUSD", v)}
        placeholder="0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        hint="Adresse commençant par 0x (BSC)"
      />

      {/* Résumé activé */}
      {anyCryptoEnabled && (
        <div className="flex items-center gap-2 p-3 bg-green-950/30 border border-green-700/30 rounded-2xl">
          <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
          <p className="text-xs text-green-300">
            Crypto activé. Les acheteurs verront le bouton{" "}
            <strong>« Payer en Crypto »</strong> sur votre page produit.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── NetworkCard ──────────────────────────────────────────────────────────────
function NetworkCard({
  logo, label, network, color,
  enabled, address, priceUSD,
  onToggle, onAddress, onPrice,
  placeholder, hint,
}: {
  logo:      React.ReactNode;
  label:     string;
  network:   string;
  color:     string;
  enabled:   boolean;
  address:   string;
  priceUSD:  string;
  onToggle:  () => void;
  onAddress: (v: string) => void;
  onPrice:   (v: string) => void;
  placeholder: string;
  hint:      string;
}) {
  const addressOk = address.trim().length > 10;
  const priceOk   = parseFloat(priceUSD) > 0;
  const complete  = enabled && addressOk && priceOk;

  return (
    <div
      className={`rounded-2xl border-2 overflow-hidden transition-all ${
        enabled ? "border-white/20 bg-white/5" : "border-white/8 bg-white/2"
      }`}
    >
      {/* Toggle header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        {logo}
        <div className="flex-1">
          <p className="font-black text-white text-sm">{label}</p>
          <p className="text-xs text-slate-500">{network}</p>
        </div>
        {/* Toggle switch */}
        <div
          className={`w-12 h-6 rounded-full flex items-center transition-colors px-1 ${
            enabled ? "justify-end" : "justify-start bg-white/10"
          }`}
          style={enabled ? { backgroundColor: color } : {}}
        >
          <div className="w-4 h-4 rounded-full bg-white shadow" />
        </div>
        {complete && (
          <div className="w-5 h-5 rounded-full flex items-center justify-center ml-2"
            style={{ backgroundColor: color + "30" }}>
            <Check className="w-3 h-3" style={{ color }} />
          </div>
        )}
      </button>

      {/* Champs config */}
      {enabled && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/8 pt-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Adresse wallet {label} *
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => onAddress(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs font-mono
                         focus:outline-none focus:border-blue-500 placeholder-slate-600 transition-colors"
            />
            <p className="text-xs text-slate-600 mt-1">{hint}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Prix en USD (USDT) *
            </label>
            <div className="relative">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={priceUSD}
                onChange={(e) => onPrice(e.target.value)}
                placeholder="Ex: 15.00"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm
                           focus:outline-none focus:border-blue-500 placeholder-slate-600 transition-colors pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                USD
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Montant que l'acheteur devra payer en {label === "BNB" ? "BNB équivalent" : "USDT"}
            </p>
          </div>

          {enabled && (!addressOk || !priceOk) && (
            <div className="flex items-start gap-2 p-2.5 bg-amber-950/30 border border-amber-700/30 rounded-xl">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400">
                {!addressOk ? "Adresse wallet requise." : "Prix USD requis."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
