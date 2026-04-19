/**
 * SectionPaiement.tsx
 *
 * Un seul mode de paiement :
 *  - "external" : Lien externe (Wave, PayDunya, CinetPay, Stripe...)
 */

import { CheckCircle, ExternalLink } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentMode = "external";

export type NexoraPayLink = {
  id: string;
  slug: string;
  nom_produit: string;
  montant: number;
  devise: string;
  url: string;
  statut: "actif" | "inactif";
};

export type PaiementFormFields = {
  payment_mode: PaymentMode;
  paiement_lien: string;
  nexora_paylink_id: string;
  nexora_paylink_url: string;
};

// ─── Composant ────────────────────────────────────────────────────────────────

interface SectionPaiementProps {
  form: PaiementFormFields;
  setForm: (fn: (prev: any) => any) => void;
}

export function SectionPaiement({ form, setForm }: SectionPaiementProps) {
  return (
    <div className="space-y-4">

      {/* ── Lien externe (seule option disponible) ── */}
      <div className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-violet-500 bg-violet-500/8">
        <span className="text-2xl">🔗</span>
        <div className="flex-1">
          <p className="font-semibold text-white text-sm">Lien externe</p>
          <p className="text-xs text-slate-500">Wave, PayDunya, CinetPay, Stripe...</p>
        </div>
        <CheckCircle className="w-5 h-5 text-violet-400 flex-shrink-0" />
      </div>

      {/* ── Champ URL ── */}
      <div className="bg-white/5 rounded-2xl p-4 border border-white/8 space-y-2">
        <label className="block text-sm font-semibold text-slate-300">URL de paiement</label>
        <input
          value={form.paiement_lien}
          onChange={e =>
            setForm((p: any) => ({
              ...p,
              paiement_lien: e.target.value,
              payment_mode: "external",
            }))
          }
          placeholder="https://pay.wave.com/m/..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm
                     focus:outline-none focus:border-blue-500 placeholder-slate-600 transition-colors"
        />
        {form.paiement_lien && (
          <a
            href={form.paiement_lien}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors mt-1"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Tester le lien
          </a>
        )}
      </div>

    </div>
  );
}

export default SectionPaiement;
