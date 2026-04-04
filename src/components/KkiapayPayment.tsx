import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    openKkiapayWidget: (config: any) => void;
    addKkiapayListener: (event: string, handler: (response: any) => void) => void;
    removeKkiapayListener: (event: string) => void;
  }
}

interface KkiapayProps {
  amount: number;
  reason: string;
  onSuccess: (transactionId: string) => void;
}

export default function KkiapayPayment({ amount, reason, onSuccess }: KkiapayProps) {
  const { toast } = useToast();

  useEffect(() => {
    // Écouteur de succès
    const successHandler = (response: any) => {
      console.log("Paiement réussi:", response.transactionId);
      onSuccess(response.transactionId);
      toast({ title: "Paiement réussi !", description: "Votre transaction a été validée." });
    };

    window.addKkiapayListener("success", successHandler);

    return () => {
      window.removeKkiapayListener("success");
    };
  }, [onSuccess]);

  const handlePayment = () => {
    window.openKkiapayWidget({
      amount: amount,
      position: "center",
      theme: "#6366f1",
      key: import.meta.env.VITE_KKIAPAY_PUBLIC_KEY,
      sandbox: false,
      data: reason,
    });
  };

  return (
    <button 
      onClick={handlePayment}
      className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg hover:scale-[1.02] transition-transform"
    >
      PAYER {amount.toLocaleString()} FCFA
    </button>
  );
}
