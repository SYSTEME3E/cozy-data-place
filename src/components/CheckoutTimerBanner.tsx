/**
 * CheckoutTimerBanner
 * ─────────────────────────────────────────────────────────────────────
 * Bandeau de compte à rebours affiché en haut du checkout.
 * - Vert > 5 min, Amber entre 2-5 min, Rouge < 2 min
 * - Animation pulsante en rouge quand < 60 secondes
 * - Modal d'expiration si le timer atteint 0
 */

import { Clock, AlertTriangle } from "lucide-react";

interface CheckoutTimerBannerProps {
  formatted: string;      // "09:45"
  secondsLeft: number;
  expired: boolean;
  onExpired: () => void;  // callback pour rediriger vers la vitrine
}

export default function CheckoutTimerBanner({
  formatted,
  secondsLeft,
  expired,
  onExpired,
}: CheckoutTimerBannerProps) {
  if (expired) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-red-100 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-black text-gray-900">Réservation expirée</h2>
          <p className="text-sm text-gray-500">
            Votre panier a été réservé pendant <strong>10 minutes</strong>, mais le délai est dépassé.
            Votre réservation a été libérée.
          </p>
          <button
            onClick={onExpired}
            className="w-full h-12 rounded-2xl bg-rose-600 text-white font-black hover:bg-rose-700 transition-colors"
          >
            Retourner à la boutique
          </button>
          <p className="text-xs text-gray-400">
            Vous pouvez recommencer votre commande — les produits sont toujours disponibles s'ils sont en stock.
          </p>
        </div>
      </div>
    );
  }

  const isUrgent  = secondsLeft <= 120; // < 2 minutes
  const isWarning = secondsLeft <= 300 && secondsLeft > 120; // 2–5 minutes

  const bgColor   = isUrgent  ? "bg-red-50 border-red-200"
                  : isWarning ? "bg-amber-50 border-amber-200"
                  : "bg-emerald-50 border-emerald-200";

  const textColor = isUrgent  ? "text-red-700"
                  : isWarning ? "text-amber-700"
                  : "text-emerald-700";

  const iconColor = isUrgent  ? "text-red-500"
                  : isWarning ? "text-amber-500"
                  : "text-emerald-500";

  const timerColor = isUrgent  ? "text-red-600"
                   : isWarning ? "text-amber-600"
                   : "text-emerald-600";

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${bgColor} ${
        isUrgent && secondsLeft <= 60 ? "animate-pulse" : ""
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Clock className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
        <div>
          <p className={`text-xs font-bold ${textColor}`}>
            {isUrgent
              ? "⚡ Dépêchez-vous !"
              : isWarning
              ? "⏳ Plus que quelques minutes"
              : "🔒 Produits réservés pour vous"
            }
          </p>
          <p className={`text-[10px] ${textColor} opacity-80`}>
            {isUrgent
              ? "Votre réservation expire très bientôt"
              : "Complétez la commande avant expiration"
            }
          </p>
        </div>
      </div>
      <div
        className={`font-black text-lg tabular-nums flex-shrink-0 ${timerColor}`}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {formatted}
      </div>
    </div>
  );
}
