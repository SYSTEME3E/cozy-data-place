/**
 * NEXORA Smart Cart — Bouton panier flottant avec badge
 * Affiché sur les pages vitrine boutique
 */


import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-context";

interface CartButtonProps {
  className?: string;
  variant?: "floating" | "inline";
}

export default function CartButton({ className = "", variant = "inline" }: CartButtonProps) {
  const { itemCount, toggleCart } = useCart();

  if (variant === "floating") {
    return (
      <button
        onClick={toggleCart}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all active:scale-95 hover:scale-105 ${className}`}
        style={{
          background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
          boxShadow: "0 8px 30px rgba(244,63,94,0.4)",
        }}
        aria-label="Ouvrir le panier"
      >
        <ShoppingBag className="w-6 h-6 text-white" />
        {itemCount > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-gray-900 text-white text-xs font-black flex items-center justify-center"
            style={{ animation: "popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
          >
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        )}
        <style>{`
          @keyframes popIn {
            0%   { transform: scale(0.5); opacity: 0 }
            70%  { transform: scale(1.2) }
            100% { transform: scale(1); opacity: 1 }
          }
        `}</style>
      </button>
    );
  }

  return (
    <button
      onClick={toggleCart}
      className={`relative flex items-center gap-2 px-4 h-10 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold transition-all active:scale-95 ${className}`}
      aria-label="Panier"
    >
      <ShoppingBag className="w-4 h-4" />
      <span>Panier</span>
      {itemCount > 0 && (
        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-xs font-black flex items-center justify-center">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </button>
  );
}
