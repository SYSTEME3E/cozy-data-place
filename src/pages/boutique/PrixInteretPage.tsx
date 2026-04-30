/**
 * PrixInteretPage — Prix d'achat, de vente, intérêt & dépenses pub par produit
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";
import { useNavigate } from "react-router-dom";
import BoutiqueLayout from "@/components/BoutiqueLayout";
import { formatPrix } from "@/lib/devise-utils";
import {
  TrendingUp, Package, Edit3, Check, X,
  ShoppingCart, DollarSign, BarChart2, ArrowLeft,
  Megaphone, Plus, Trash2, Calendar, ChevronDown, ChevronUp,
  Info,
} from "lucide-react";

interface CampagnePub {
  id: string;
  produit_id: string;
  plateforme: string;
  budget_jour: number;
  date_debut: string;
  date_fin: string;
}

interface ProduitProfit {
  id: string;
  nom: string;
  photos: string[];
  prix: number;
  prix_promo: number | null;
  prix_achat: number | null;
  stock: number;
  stock_illimite: boolean;
  actif: boolean;
  nb_ventes: number;
  campagnes: CampagnePub[];
}

const PLATEFORMES = [
  {
    value: "Facebook Ads", label: "Facebook Ads",
    logo: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="8" fill="#1877F2"/>
        <path d="M22 16C22 12.686 19.314 10 16 10C12.686 10 10 12.686 10 16C10 18.994 12.014 21.516 14.75 22.32V17.875H13.25V16H14.75V14.5C14.75 13.121 15.871 12 17.25 12H19V13.875H17.625C17.211 13.875 16.875 14.211 16.875 14.625V16H19L18.625 17.875H16.875V22.32C19.611 21.516 22 18.994 22 16Z" fill="white"/>
      </svg>
    ),
  },
  {
    value: "TikTok Ads", label: "TikTok Ads",
    logo: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="8" fill="#010101"/>
        <path d="M21.5 9C21.5 9 21.8 11.5 24 12.3V15C24 15 22.1 14.9 21.5 13.8V19.5C21.5 22.5 19.2 25 16.2 25C13.2 25 11 22.5 11 19.5C11 16.5 13.2 14 16.2 14C16.5 14 16.8 14 17.1 14.1V17.2C16.8 17.1 16.5 17 16.2 17C14.8 17 13.7 18.1 13.7 19.5C13.7 20.9 14.8 22 16.2 22C17.6 22 18.8 20.9 18.8 19.5V7H21.5V9Z" fill="white"/>
        <path d="M21.5 9C21.5 9 21.8 11.5 24 12.3V15C24 15 22.1 14.9 21.5 13.8V19.5C21.5 22.5 19.2 25 16.2 25C13.2 25 11 22.5 11 19.5C11 16.5 13.2 14 16.2 14C16.5 14 16.8 14 17.1 14.1V17.2C16.8 17.1 16.5 17 16.2 17C14.8 17 13.7 18.1 13.7 19.5C13.7 20.9 14.8 22 16.2 22C17.6 22 18.8 20.9 18.8 19.5V7H21.5V9Z" fill="#69C9D0" fillOpacity="0.5"/>
        <path d="M22.5 8C22.5 8 22.8 10.5 25 11.3V13.7C24.5 13.7 22.8 13.3 21.5 12V19.5C21.5 22.5 19.2 25 16.2 25C13.2 25 11 22.5 11 19.5C11 16.5 13.2 14 16.2 14C16.5 14 16.8 14 17.1 14.1V16.5C16.8 16.4 16.5 16.3 16.2 16.3C14.6 16.3 13.3 17.6 13.3 19.2C13.3 20.8 14.6 22.1 16.2 22.1C17.8 22.1 19.1 20.9 19.2 19.3L19.2 7H22.5V8Z" fill="#EE1D52"/>
      </svg>
    ),
  },
  {
    value: "Google Ads", label: "Google Ads",
    logo: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="8" fill="white"/>
        <path d="M16 7C11.03 7 7 11.03 7 16C7 20.97 11.03 25 16 25C20.97 25 25 20.97 25 16C25 11.03 20.97 7 16 7Z" fill="white"/>
        <path d="M22.16 16.19C22.16 15.72 22.12 15.27 22.04 14.84H16V17.38H19.46C19.3 18.2 18.83 18.89 18.11 19.35V21H20.25C21.5 19.85 22.16 18.17 22.16 16.19Z" fill="#4285F4"/>
        <path d="M16 23C17.75 23 19.22 22.43 20.25 21L18.11 19.35C17.54 19.74 16.82 19.97 16 19.97C14.32 19.97 12.9 18.81 12.4 17.25H10.19V18.95C11.22 20.98 13.44 23 16 23Z" fill="#34A853"/>
        <path d="M12.4 17.25C12.27 16.86 12.2 16.44 12.2 16C12.2 15.56 12.27 15.14 12.4 14.75V13.05H10.19C9.73 13.97 9.5 15 9.5 16C9.5 17 9.73 18.03 10.19 18.95L12.4 17.25Z" fill="#FBBC05"/>
        <path d="M16 12.03C16.9 12.03 17.71 12.35 18.34 12.97L20.29 11.02C19.22 10.02 17.75 9.5 16 9.5C13.44 9.5 11.22 11.02 10.19 13.05L12.4 14.75C12.9 13.19 14.32 12.03 16 12.03Z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    value: "Instagram Ads", label: "Instagram Ads",
    logo: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="ig1" cx="30%" cy="107%" r="150%">
            <stop offset="0%" stopColor="#fdf497"/>
            <stop offset="5%" stopColor="#fdf497"/>
            <stop offset="45%" stopColor="#fd5949"/>
            <stop offset="60%" stopColor="#d6249f"/>
            <stop offset="90%" stopColor="#285AEB"/>
          </radialGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#ig1)"/>
        <rect x="9" y="9" width="14" height="14" rx="4" stroke="white" strokeWidth="1.8" fill="none"/>
        <circle cx="16" cy="16" r="3.5" stroke="white" strokeWidth="1.8" fill="none"/>
        <circle cx="20.5" cy="11.5" r="1" fill="white"/>
      </svg>
    ),
  },
  {
    value: "WhatsApp", label: "WhatsApp",
    logo: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="8" fill="#25D366"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M16 8C11.58 8 8 11.58 8 16C8 17.66 8.5 19.2 9.34 20.5L8.1 24L11.72 22.78C12.98 23.55 14.44 24 16 24C20.42 24 24 20.42 24 16C24 11.58 20.42 8 16 8ZM13.21 13.5C13.37 13.5 13.54 13.5 13.69 13.51C13.87 13.52 14.07 13.54 14.25 13.96C14.46 14.44 14.91 15.59 14.97 15.71C15.03 15.83 15.07 15.97 14.99 16.13C14.91 16.29 14.87 16.39 14.75 16.53C14.63 16.67 14.5 16.84 14.39 16.95C14.27 17.07 14.15 17.2 14.29 17.44C14.43 17.68 14.91 18.47 15.63 19.11C16.55 19.93 17.33 20.19 17.57 20.31C17.81 20.43 17.95 20.41 18.09 20.25C18.23 20.09 18.69 19.55 18.85 19.31C19.01 19.07 19.17 19.11 19.39 19.19C19.61 19.27 20.74 19.83 20.98 19.95C21.22 20.07 21.38 20.13 21.44 20.23C21.5 20.33 21.5 20.81 21.3 21.37C21.1 21.93 20.14 22.45 19.7 22.49C19.26 22.53 18.85 22.7 17 21.97C14.71 21.08 13.27 18.72 13.15 18.56C13.03 18.4 12.2 17.29 12.2 16.14C12.2 14.99 12.81 14.43 13.03 14.19C13.25 13.95 13.51 13.88 13.67 13.88L13.21 13.5Z" fill="white"/>
      </svg>
    ),
  },
  {
    value: "Autre", label: "Autre",
    logo: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="8" fill="#8B5CF6"/>
        <path d="M16 9L18.5 14H23.5L19.5 17.5L21 23L16 20L11 23L12.5 17.5L8.5 14H13.5L16 9Z" fill="white"/>
      </svg>
    ),
  },
];

function nbJours(debut: string, fin: string): number {
  const d1 = new Date(debut).getTime();
  const d2 = new Date(fin).getTime();
  if (isNaN(d1) || isNaN(d2) || d2 < d1) return 0;
  return Math.ceil((d2 - d1) / 86_400_000) + 1;
}

function depenseTotaleCampagne(c: CampagnePub): number {
  return c.budget_jour * nbJours(c.date_debut, c.date_fin);
}

function isCampagneActive(c: CampagnePub): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return c.date_debut <= today && today <= c.date_fin;
}

function isCampagneTerminee(c: CampagnePub): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return c.date_fin < today;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

/** Nombre de jours de campagne déjà écoulés (jusqu'à aujourd'hui inclus) */
function joursEcoules(debut: string, fin: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const effectiveFin = today < fin ? today : fin;
  return nbJours(debut, effectiveFin);
}

function ProfitBadge({ pct }: { pct: number }) {
  if (pct <= 0) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">Perte {pct.toFixed(0)}%</span>;
  if (pct < 20)  return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">+{pct.toFixed(0)}%</span>;
  if (pct < 50)  return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#305CDE] dark:bg-blue-950/40 dark:text-[#305CDE]">+{pct.toFixed(0)}%</span>;
  return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-[#008000] dark:bg-green-950/40 dark:text-[#008000]">+{pct.toFixed(0)}%</span>;
}

function FormCampagne({ produitId, devise, onSaved, onCancel }: {
  produitId: string; devise: string; onSaved: () => void; onCancel: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [plateforme, setPlateforme] = useState("Facebook Ads");
  const [budgetJour, setBudgetJour] = useState("");
  const [dateDebut, setDateDebut] = useState(today);
  const [dateFin, setDateFin] = useState(today);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const nb = nbJours(dateDebut, dateFin);
  const total = nb * (parseFloat(budgetJour) || 0);

  const handleSave = async () => {
    if (!budgetJour || parseFloat(budgetJour) <= 0 || !dateDebut || !dateFin) return;
    setSaving(true);
    setSaveError(null);
    const { error } = await supabase.from("campagnes_pub" as any).insert({ produit_id: produitId, plateforme, budget_jour: parseFloat(budgetJour), date_debut: dateDebut, date_fin: dateFin });
    setSaving(false);
    if (error) {
      setSaveError("Erreur lors de l'enregistrement. Réessayez.");
      return;
    }
    onSaved();
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-[#305CDE] dark:border-[#305CDE] rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-[#305CDE]" />
        <p className="text-sm font-bold text-gray-800 dark:text-white">Nouvelle campagne pub</p>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Plateforme</label>
        <div className="grid grid-cols-3 gap-2">
          {PLATEFORMES.map(pl => (
            <button key={pl.value} type="button" onClick={() => setPlateforme(pl.value)}
              className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border-2 text-xs font-bold transition-all ${
                plateforme === pl.value ? "border-[#305CDE] bg-[#305CDE]/5 dark:bg-[#305CDE]/20 text-[#305CDE] dark:text-[#305CDE]" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
              }`}>
              {pl.logo}
              <span className="truncate w-full text-center text-[10px] leading-tight">{pl.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Budget journalier ({devise})</label>
        <input type="number" min="0" value={budgetJour} onChange={e => setBudgetJour(e.target.value)}
          placeholder="Ex: 2 000"
          className="w-full h-11 px-4 text-base font-bold border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-[#305CDE] focus:outline-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Date début</label>
          <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
            className="w-full h-10 px-3 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-[#305CDE] focus:outline-none" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Date fin</label>
          <input type="date" value={dateFin} min={dateDebut} onChange={e => setDateFin(e.target.value)}
            className="w-full h-10 px-3 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-[#305CDE] focus:outline-none" />
        </div>
      </div>

      {/* Résumé avant enregistrement */}
      {budgetJour && nb > 0 && (
        <div className="bg-[#305CDE]/5 dark:bg-[#305CDE]/20 border border-[#305CDE] dark:border-[#305CDE] rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#305CDE] dark:text-[#305CDE] font-semibold">{nb} jour{nb > 1 ? "s" : ""} de pub</p>
              <p className="text-xs text-[#305CDE]">{formatPrix(parseFloat(budgetJour) || 0, devise)} × {nb} j</p>
            </div>
            <p className="text-lg font-black text-[#305CDE] dark:text-[#305CDE]">-{formatPrix(total, devise)}</p>
          </div>
          <div className="flex items-start gap-2 bg-[#305CDE]/10 dark:bg-[#305CDE]/30 rounded-lg px-2.5 py-2">
            <Info className="w-3.5 h-3.5 text-[#305CDE] mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-[#305CDE] dark:text-[#305CDE] leading-tight">
              Chaque jour de la campagne, {formatPrix(parseFloat(budgetJour) || 0, devise)} seront déduits de l'intérêt journalier de ce produit.
              Après la fin de la campagne, l'intérêt total net sera calculé automatiquement.
            </p>
          </div>
        </div>
      )}

      {saveError && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400">
          {saveError}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 h-10 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Annuler</button>
        <button onClick={handleSave} disabled={saving || !budgetJour || nb <= 0}
          className="flex-1 h-10 rounded-xl bg-[#305CDE] hover:bg-[#305CDE] text-white text-sm font-bold shadow-lg shadow-purple-200 dark:shadow-purple-900/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <><Check className="w-4 h-4" /> Enregistrer</>}
        </button>
      </div>
    </div>
  );
}

/** Affiche la décomposition journalière d'une campagne : pub déduite chaque jour */
function CampagneDetailJours({ campagne, prixVente, prixAchat, devise }: {
  campagne: CampagnePub; prixVente: number; prixAchat: number | null; devise: string;
}) {
  const [open, setOpen] = useState(false);
  const nb = nbJours(campagne.date_debut, campagne.date_fin);
  const today = new Date().toISOString().slice(0, 10);

  const days: { date: string; pubJour: number; statut: "passé" | "aujourd'hui" | "à venir" }[] = [];
  for (let i = 0; i < nb; i++) {
    const d = new Date(campagne.date_debut);
    d.setDate(d.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    days.push({
      date: ds,
      pubJour: campagne.budget_jour,
      statut: ds < today ? "passé" : ds === today ? "aujourd'hui" : "à venir",
    });
  }

  const joursPassesCount = days.filter(d => d.statut !== "à venir").length;
  const depenseDejaEngagee = joursPassesCount * campagne.budget_jour;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full text-xs text-[#305CDE] dark:text-[#305CDE] font-semibold flex items-center justify-center gap-1 py-1.5 hover:underline">
        Voir détail jour par jour <ChevronDown className="w-3.5 h-3.5" />
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <button onClick={() => setOpen(false)}
        className="w-full text-xs text-[#305CDE] dark:text-[#305CDE] font-semibold flex items-center justify-center gap-1 py-1.5 hover:underline">
        Masquer le détail <ChevronUp className="w-3.5 h-3.5" />
      </button>
      <div className="space-y-1 max-h-52 overflow-y-auto rounded-xl border border-[#305CDE] dark:border-[#305CDE]">
        {days.map((d, i) => {
          const interetJour = prixAchat !== null ? prixVente - prixAchat : null;
          const netJour = interetJour !== null ? interetJour - d.pubJour : null;
          const isPasse = d.statut !== "à venir";
          return (
            <div key={i} className={`flex items-center justify-between px-3 py-2 text-xs border-b border-[#305CDE] dark:border-[#305CDE]/50 last:border-0 ${d.statut === "aujourd'hui" ? "bg-[#305CDE]/5 dark:bg-[#305CDE]/20" : "bg-white dark:bg-gray-800"}`}>
              <div>
                <span className={`font-bold ${d.statut === "aujourd'hui" ? "text-[#305CDE] dark:text-[#305CDE]" : isPasse ? "text-gray-600 dark:text-gray-400" : "text-gray-400 dark:text-gray-600"}`}>
                  {formatDate(d.date)}
                  {d.statut === "aujourd'hui" && <span className="ml-1 text-[9px] bg-[#305CDE] dark:bg-[#305CDE] text-[#305CDE] dark:text-[#305CDE] px-1.5 py-0.5 rounded-full">Auj.</span>}
                  {d.statut === "à venir" && <span className="ml-1 text-[9px] text-gray-400">à venir</span>}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-red-500 font-semibold">-{formatPrix(d.pubJour, devise)}</span>
                {netJour !== null && isPasse && (
                  <span className={`font-black ${netJour >= 0 ? "text-[#008000] dark:text-[#008000]" : "text-red-600 dark:text-red-400"}`}>
                    {netJour >= 0 ? "+" : ""}{formatPrix(netJour, devise)}/vente
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {joursPassesCount > 0 && (
        <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900 rounded-xl px-3 py-2">
          <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">{joursPassesCount} jour{joursPassesCount > 1 ? "s" : ""} de pub déjà engagé{joursPassesCount > 1 ? "s" : ""}</span>
          <span className="text-sm font-black text-orange-700 dark:text-orange-300">-{formatPrix(depenseDejaEngagee, devise)}</span>
        </div>
      )}
    </div>
  );
}

export default function PrixInteretPage() {
  const navigate = useNavigate();
  const [boutique, setBoutique] = useState<any>(null);
  const [produits, setProduits] = useState<ProduitProfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [addPubId, setAddPubId] = useState<string | null>(null);
  const devise = boutique?.devise || "XOF";

  const load = async () => {
    setLoading(true);
    const userId = getNexoraUser()?.id;
    if (!userId) { setLoading(false); return; }
    const { data: b } = await supabase.from("boutiques" as any).select("*").eq("user_id", userId).limit(1).maybeSingle();
    if (!b) { setLoading(false); return; }
    setBoutique(b);
    const { data: phys } = await supabase.from("produits" as any).select("id,nom,photos,prix,prix_promo,prix_achat,stock,stock_illimite,actif").eq("boutique_id", (b as any).id).eq("type","physique").order("created_at",{ascending:false});
    const { data: cmds } = await supabase.from("commandes" as any).select("items").eq("boutique_id",(b as any).id).neq("statut","annulee");
    const ids = (phys || []).map((p: any) => p.id);
    const { data: campagnes } = ids.length > 0 ? await supabase.from("campagnes_pub" as any).select("*").in("produit_id", ids) : { data: [] };
    const ventesMap: Record<string,number> = {};
    (cmds||[]).forEach((cmd:any)=>{(Array.isArray(cmd.items)?cmd.items:[]).forEach((item:any)=>{if(item.produit_id)ventesMap[item.produit_id]=(ventesMap[item.produit_id]||0)+(item.quantite||1);});});
    const campMap: Record<string,CampagnePub[]> = {};
    (campagnes||[]).forEach((c:any)=>{ if(!campMap[c.produit_id])campMap[c.produit_id]=[]; campMap[c.produit_id].push(c); });
    setProduits((phys as any[]||[]).map(p=>({...p,prix_achat:(p as any).prix_achat??null,nb_ventes:ventesMap[p.id]||0,campagnes:campMap[p.id]||[]})));
    setLoading(false);
  };

  useEffect(()=>{load();},[]);

  const startEdit = (p: ProduitProfit) => { setEditingId(p.id); setEditVal(p.prix_achat!==null?String(p.prix_achat):""); };
  const cancelEdit = () => { setEditingId(null); setEditVal(""); };
  const saveEdit = async (id: string) => {
    setSavingEdit(true);
    const val = editVal.trim()===""?null:parseFloat(editVal);
    await supabase.from("produits" as any).update({prix_achat:val}).eq("id",id);
    setSavingEdit(false); setEditingId(null); setEditVal(""); load();
  };
  const deleteCampagne = async (id: string) => { await supabase.from("campagnes_pub" as any).delete().eq("id",id); load(); };

  // Totaux globaux
  const totalInteretBrut = produits.reduce((acc,p)=>{ const pv=p.prix_promo??p.prix; if(p.prix_achat===null)return acc; return acc+(pv-p.prix_achat)*p.nb_ventes; },0);
  // Seule la dépense pub déjà engagée (jours écoulés × budget/jour) est déduite du solde
  const totalDepensePubEngagee = produits.reduce((acc,p)=>acc+p.campagnes.reduce((a,c)=>{ const je=joursEcoules(c.date_debut,c.date_fin); return a+je*c.budget_jour; },0),0);
  const totalDepensePubBudgetee = produits.reduce((acc,p)=>acc+p.campagnes.reduce((a,c)=>a+depenseTotaleCampagne(c),0),0);
  const totalInteretNet = totalInteretBrut - totalDepensePubEngagee;
  const totalDepenseAujourdhuiGlobal = produits.reduce((acc,p)=>acc+p.campagnes.filter(isCampagneActive).reduce((a,c)=>a+c.budget_jour,0),0);
  const totalVentes = produits.reduce((acc,p)=>acc+p.nb_ventes,0);
  const totalCA = produits.reduce((acc,p)=>acc+(p.prix_promo??p.prix)*p.nb_ventes,0);

  return (
    <BoutiqueLayout boutiqueName={boutique?.nom} boutiqueSlug={boutique?.slug}>
      <div className="space-y-5 pb-10">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={()=>navigate("/boutique/produits")} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-[#008000]" /> Prix & Intérêts
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Marges, bénéfices et dépenses pub</p>
          </div>
        </div>

        {/* Stats globales */}
        <div className="space-y-3">
          {/* Intérêt net — carte principale */}
          <div className="bg-gradient-to-br from-[#1D4ED8] to-[#305CDE] rounded-2xl p-5 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold opacity-80">Intérêt net total</p>
                <p className="text-3xl font-black mt-0.5">{formatPrix(totalInteretNet, devise)}</p>
                <p className="text-[11px] opacity-70 mt-1.5">
                  Brut <span className="font-bold">{formatPrix(totalInteretBrut,devise)}</span>
                  {" — "} Pub engagée <span className="font-bold">-{formatPrix(totalDepensePubEngagee,devise)}</span>
                </p>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <DollarSign className="w-7 h-7" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 className="w-4 h-4 text-[#305CDE]" />
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">CA total</p>
              </div>
              <p className="text-lg font-black text-gray-800 dark:text-gray-100">{formatPrix(totalCA,devise)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="w-4 h-4 text-[#305CDE]" />
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Ventes totales</p>
              </div>
              <p className="text-lg font-black text-gray-800 dark:text-gray-100">{totalVentes}</p>
            </div>
            <div className="bg-black/5 dark:bg-black/40 border border-black/20 dark:border-black/60 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Megaphone className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Pub aujourd'hui</p>
              </div>
              <p className="text-lg font-black text-gray-900 dark:text-gray-100">-{formatPrix(totalDepenseAujourdhuiGlobal,devise)}</p>
            </div>
            <div className="bg-black/5 dark:bg-black/40 border border-black/20 dark:border-black/60 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Megaphone className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Total pub</p>
              </div>
              <p className="text-lg font-black text-gray-900 dark:text-gray-100">-{formatPrix(totalDepensePubEngagee,devise)}</p>
              {totalDepensePubBudgetee > totalDepensePubEngagee && (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Budgeté: -{formatPrix(totalDepensePubBudgetee,devise)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Liste produits */}
        {loading ? (
          <div className="flex justify-center py-14">
            <div className="w-8 h-8 border-4 border-[#008000] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : produits.length === 0 ? (
          <div className="text-center py-14 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl">
            <Package className="w-12 h-12 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Aucun produit physique</p>
            <button onClick={()=>navigate("/boutique/produits/nouveau")} className="mt-4 bg-[#008000] hover:bg-[#008000] text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors">+ Créer un produit</button>
          </div>
        ) : (
          <div className="space-y-4">
            {produits.map(p => {
              const prixVente = p.prix_promo ?? p.prix;
              const achat = p.prix_achat;
              const interetUnit = achat !== null ? prixVente - achat : null;
              // % intérêt = (vente - achat) / achat × 100  (marge sur coût)
              const pct = achat !== null && achat > 0 ? ((prixVente-achat)/achat)*100 : null;
              const interetBrut = interetUnit !== null ? interetUnit * p.nb_ventes : null;

              // Dépense pub déjà engagée (jours passés uniquement) — seule cette somme réduit le solde
              const depensePubEngagee = p.campagnes.reduce((acc, c) => {
                const je = joursEcoules(c.date_debut, c.date_fin);
                return acc + je * c.budget_jour;
              }, 0);
              // Budget pub total prévu (pour affichage informatif)
              const depensePubTotal = p.campagnes.reduce((a,c)=>a+depenseTotaleCampagne(c),0);
              const depensePubRestante = depensePubTotal - depensePubEngagee;
              const depensePubAujourdhui = p.campagnes.filter(isCampagneActive).reduce((a,c)=>a+c.budget_jour,0);

              // Intérêt net = brut − pub engagée seulement
              const interetNet = interetBrut !== null ? interetBrut - depensePubEngagee : null;

              // Pourcentages sur le prix de vente
              const pctInteret = achat !== null && prixVente > 0 ? ((prixVente - achat) / prixVente) * 100 : null;
              const pctPub = prixVente > 0 && depensePubEngagee > 0 && p.nb_ventes > 0
                ? (depensePubEngagee / (prixVente * p.nb_ventes)) * 100 : null;
              const pctGeneral = pctInteret !== null ? (pctPub !== null ? pctInteret - pctPub : pctInteret) : null;

              const isOpen = openId === p.id;
              const isEditing = editingId === p.id;
              const isAddingPub = addPubId === p.id;
              const campagnesActives = p.campagnes.filter(isCampagneActive);
              const campagnesEnCours = p.campagnes.filter(c => !isCampagneTerminee(c));

              return (
                <div key={p.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">

                  {/* En-tête produit — clic pour ouvrir */}
                  <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={()=>setOpenId(isOpen?null:p.id)}>
                    <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {p.photos?.[0] ? <img src={p.photos[0]} alt="" className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{p.nom}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="text-sm font-black text-[#305CDE] dark:text-[#305CDE]">{formatPrix(prixVente,devise)}</span>
                        {p.prix_promo && <span className="text-xs text-gray-400 line-through">{formatPrix(p.prix,devise)}</span>}
                        {pctGeneral !== null && <ProfitBadge pct={pctGeneral} />}
                        {campagnesActives.length > 0 && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#305CDE]/10 text-[#305CDE] dark:bg-[#305CDE]/20 dark:text-[#305CDE] flex items-center gap-1">
                            <Megaphone className="w-3 h-3" /> Pub active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-400 flex items-center gap-1"><ShoppingCart className="w-3 h-3" />{p.nb_ventes} vente{p.nb_ventes>1?"s":""}</span>
                        {interetNet !== null && (
                          <span className={`text-xs font-bold ${interetNet>=0?"text-[#008000] dark:text-[#008000]":"text-red-500"}`}>
                            Net: {interetNet>=0?"+":""}{formatPrix(interetNet,devise)}
                          </span>
                        )}
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                  </div>

                  {/* Détail */}
                  {isOpen && (
                    <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4 space-y-5">

                      {/* Prix d'achat */}
                      <div>
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">💰 Prix & Marge</p>
                        <div className="flex items-center justify-between gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Prix d'achat</p>
                            {!isEditing ? (
                              <p className={`text-base font-black mt-0.5 ${achat!==null?"text-[#305CDE] dark:text-[#305CDE]":"text-gray-300 dark:text-gray-600"}`}>
                                {achat!==null ? formatPrix(achat,devise) : "— Non défini"}
                              </p>
                            ) : (
                              <div className="flex items-center gap-2 mt-1">
                                <input type="number" min="0" value={editVal} onChange={e=>setEditVal(e.target.value)} placeholder="0" autoFocus
                                  className="w-28 h-8 px-3 text-sm font-bold border-2 border-[#305CDE] rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none" />
                                <button onClick={()=>saveEdit(p.id)} disabled={savingEdit} className="w-8 h-8 flex items-center justify-center bg-[#008000] hover:bg-[#008000] text-white rounded-lg"><Check className="w-4 h-4" /></button>
                                <button onClick={cancelEdit} className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg"><X className="w-4 h-4" /></button>
                              </div>
                            )}
                          </div>
                          {!isEditing && (
                            <button onClick={()=>startEdit(p)} className="flex items-center gap-1.5 text-xs font-semibold text-[#305CDE] bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/60 px-3 py-1.5 rounded-xl transition-colors">
                              <Edit3 className="w-3.5 h-3.5" />{achat!==null?"Modifier":"Saisir"}
                            </button>
                          )}
                        </div>

                        {achat !== null && interetUnit !== null && (
                          <>
                            <div className="grid grid-cols-4 gap-2 mt-3">
                              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-center">
                                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Achat</p>
                                <p className="text-sm font-black text-gray-800 dark:text-gray-100 mt-0.5">{formatPrix(achat,devise)}</p>
                              </div>
                              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-center">
                                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Vente</p>
                                <p className="text-sm font-black text-gray-800 dark:text-gray-100 mt-0.5">{formatPrix(prixVente,devise)}</p>
                              </div>
                              <div className={`rounded-xl p-2.5 text-center border ${interetUnit>=0?"bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-[#008000]":"bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900"}`}>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">/ unité</p>
                                <p className={`text-sm font-black mt-0.5 ${interetUnit>=0?"text-[#008000] dark:text-[#008000]":"text-red-600 dark:text-red-400"}`}>{interetUnit>=0?"+":""}{formatPrix(interetUnit,devise)}</p>
                              </div>
                              <div className={`rounded-xl p-2.5 text-center border ${(interetBrut||0)>=0?"bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-[#008000]":"bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900"}`}>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Brut</p>
                                <p className={`text-sm font-black mt-0.5 ${(interetBrut||0)>=0?"text-[#008000] dark:text-[#008000]":"text-red-600 dark:text-red-400"}`}>{(interetBrut||0)>=0?"+":""}{formatPrix(interetBrut||0,devise)}</p>
                              </div>
                            </div>

                            {/* Bloc pourcentages */}
                            <div className="mt-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 space-y-2">
                              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">📊 Répartition (% sur prix de vente)</p>
                              {/* Barre visuelle */}
                              <div className="h-3 w-full rounded-full overflow-hidden flex">
                                {pctInteret !== null && pctPub !== null && (() => {
                                  const netPct = Math.max(0, pctInteret - pctPub);
                                  const pubPct = Math.min(pctPub, pctInteret);
                                  const coutPct = 100 - pctInteret;
                                  return (
                                    <>
                                      <div className="h-full bg-gray-200 dark:bg-gray-700 transition-all" style={{width:`${coutPct}%`}} title="Coût d'achat" />
                                      <div className="h-full bg-[#305CDE] dark:bg-[#305CDE] transition-all" style={{width:`${pubPct}%`}} title="Pub" />
                                      <div className="h-full bg-[#008000] dark:bg-[#008000] transition-all" style={{width:`${netPct}%`}} title="Intérêt net" />
                                    </>
                                  );
                                })()}
                                {pctInteret !== null && pctPub === null && (
                                  <>
                                    <div className="h-full bg-gray-200 dark:bg-gray-700" style={{width:`${100-pctInteret}%`}} />
                                    <div className="h-full bg-[#008000] dark:bg-[#008000]" style={{width:`${pctInteret}%`}} />
                                  </>
                                )}
                              </div>
                              {/* Légende */}
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-2.5 h-2.5 rounded-sm bg-gray-200 dark:bg-gray-700 inline-block" />Coût {pctInteret!==null?(100-pctInteret).toFixed(0):"-"}%</span>
                                {pctPub !== null && <span className="flex items-center gap-1 text-[10px] text-[#305CDE]"><span className="w-2.5 h-2.5 rounded-sm bg-[#305CDE] inline-block" />Pub {pctPub.toFixed(1)}%</span>}
                                <span className={`flex items-center gap-1 text-[10px] font-bold ${(pctGeneral||0)>=0?"text-[#008000] dark:text-[#008000]":"text-red-500"}`}>
                                  <span className={`w-2.5 h-2.5 rounded-sm inline-block ${(pctGeneral||0)>=0?"bg-[#008000]":"bg-red-400"}`} />
                                  Net {pctGeneral!==null?`${pctGeneral>=0?"+":""}${pctGeneral.toFixed(1)}%`:"-"}
                                </span>
                              </div>
                              {/* Chiffres détaillés */}
                              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
                                <div className="text-center">
                                  <p className="text-[10px] text-gray-400 font-semibold">% Intérêt</p>
                                  <p className={`text-sm font-black ${pctInteret!==null&&pctInteret>=0?"text-[#008000] dark:text-[#008000]":"text-red-500"}`}>
                                    {pctInteret!==null?`${pctInteret>=0?"+":""}${pctInteret.toFixed(1)}%`:"—"}
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[10px] text-gray-400 font-semibold">% Pub</p>
                                  <p className="text-sm font-black text-[#305CDE] dark:text-[#305CDE]">
                                    {pctPub!==null?`-${pctPub.toFixed(1)}%`:"—"}
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[10px] text-gray-400 font-semibold">% Général</p>
                                  <p className={`text-sm font-black ${(pctGeneral||0)>=0?"text-[#008000] dark:text-[#008000]":"text-red-500"}`}>
                                    {pctGeneral!==null?`${pctGeneral>=0?"+":""}${pctGeneral.toFixed(1)}%`:"—"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Campagnes pub */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">📣 Dépenses Publicité</p>
                          {!isAddingPub && (
                            <button onClick={()=>setAddPubId(p.id)} className="flex items-center gap-1 text-xs font-bold text-[#305CDE] dark:text-[#305CDE] bg-[#305CDE]/5 dark:bg-[#305CDE]/20 hover:bg-[#305CDE] dark:hover:bg-[#305CDE]/60 px-3 py-1.5 rounded-xl transition-colors">
                              <Plus className="w-3.5 h-3.5" /> Ajouter campagne
                            </button>
                          )}
                        </div>

                        {isAddingPub && (
                          <div className="mb-3">
                            <FormCampagne produitId={p.id} devise={devise} onSaved={()=>{setAddPubId(null);load();}} onCancel={()=>setAddPubId(null)} />
                          </div>
                        )}

                        {p.campagnes.length === 0 && !isAddingPub ? (
                          <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
                            <Megaphone className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto mb-1" />
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Aucune campagne pub</p>
                            <p className="text-[10px] text-gray-300 dark:text-gray-600 max-w-xs mx-auto">
                              Ajoutez une campagne Facebook Ads, TikTok, etc. pour suivre vos dépenses pub et calculer votre intérêt net réel.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {p.campagnes.map(c => {
                              const total = depenseTotaleCampagne(c);
                              const nb = nbJours(c.date_debut, c.date_fin);
                              const active = isCampagneActive(c);
                              const terminee = isCampagneTerminee(c);
                              const platefInfo = PLATEFORMES.find(pl=>pl.value===c.plateforme);
                              const je = joursEcoules(c.date_debut, c.date_fin);
                              const depenseEngagee = je * c.budget_jour;
                              const depenseRestante = total - depenseEngagee;
                              return (
                                <div key={c.id} className={`rounded-xl border overflow-hidden ${active?"border-[#305CDE] dark:border-[#305CDE]":terminee?"border-gray-200 dark:border-gray-700":"border-blue-200 dark:border-[#305CDE]"}`}>
                                  <div className={`p-3 ${active?"bg-[#305CDE]/5 dark:bg-[#305CDE]/20":terminee?"bg-gray-50 dark:bg-gray-900/30":"bg-blue-50 dark:bg-blue-950/20"}`}>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="flex items-center gap-1.5 text-sm font-bold text-gray-800 dark:text-gray-100">
                                            <span className="w-5 h-5 inline-flex items-center justify-center flex-shrink-0">{platefInfo?.logo}</span>
                                            {c.plateforme}
                                          </span>
                                          {active && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-[#008000] dark:bg-green-950/40 dark:text-[#008000] animate-pulse">● En cours</span>}
                                          {terminee && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">Terminée</span>}
                                          {!active && !terminee && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-[#305CDE] dark:bg-blue-950/40 dark:text-[#305CDE]">À venir</span>}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                                          <Calendar className="w-3 h-3" />{formatDate(c.date_debut)} → {formatDate(c.date_fin)} <span className="text-gray-400">({nb}j)</span>
                                        </p>
                                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                          <span className="text-xs text-gray-500 dark:text-gray-400">{formatPrix(c.budget_jour,devise)}/jour</span>
                                          <span className="text-sm font-black text-[#305CDE] dark:text-[#305CDE]">-{formatPrix(total,devise)} total</span>
                                        </div>

                                        {/* Barre de progression de la campagne */}
                                        {nb > 0 && (
                                          <div className="mt-2 space-y-1">
                                            <div className="flex items-center justify-between text-[10px] text-gray-400">
                                              <span>{je} jour{je>1?"s":""} écoulé{je>1?"s":""} sur {nb}</span>
                                              <span>{Math.round((je/nb)*100)}%</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                              <div className={`h-full rounded-full transition-all ${active?"bg-[#305CDE]":terminee?"bg-gray-400":"bg-[#305CDE]"}`}
                                                style={{width:`${Math.min(100,Math.round((je/nb)*100))}%`}} />
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] font-semibold">
                                              <span className="text-orange-600 dark:text-orange-400">Déjà dépensé: -{formatPrix(depenseEngagee,devise)}</span>
                                              {depenseRestante > 0 && <span className="text-gray-400">Reste: -{formatPrix(depenseRestante,devise)}</span>}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      <button onClick={()=>deleteCampagne(c.id)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/60 text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Détail jour par jour */}
                                  <div className="px-3 pb-3 pt-2 bg-white dark:bg-gray-800">
                                    <CampagneDetailJours campagne={c} prixVente={prixVente} prixAchat={achat} devise={devise} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Résumé pub + intérêt net */}
                        {p.campagnes.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {depensePubAujourdhui > 0 && (
                              <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900 rounded-xl px-4 py-2.5">
                                <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">Dépense pub aujourd'hui</span>
                                <span className="text-sm font-black text-orange-700 dark:text-orange-400">-{formatPrix(depensePubAujourdhui,devise)}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between bg-[#305CDE]/5 dark:bg-[#305CDE]/20 border border-[#305CDE] dark:border-[#305CDE] rounded-xl px-4 py-2.5">
                              <div>
                                <span className="text-xs font-semibold text-[#305CDE] dark:text-[#305CDE]">Pub déjà engagée</span>
                                {depensePubRestante > 0 && <p className="text-[10px] text-[#305CDE]">Restante: -{formatPrix(depensePubRestante,devise)}</p>}
                              </div>
                              <span className="text-sm font-black text-[#305CDE] dark:text-[#305CDE]">-{formatPrix(depensePubEngagee,devise)}</span>
                            </div>
                            {interetNet !== null && (
                              <div className={`flex items-center justify-between rounded-xl px-4 py-3 border-2 ${interetNet>=0?"bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-[#008000]":"bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"}`}>
                                <div>
                                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{interetNet>=0?"✅ Intérêt net (après pub)":"⚠️ Déficit net (après pub)"}</p>
                                  <p className="text-[10px] text-gray-400 dark:text-gray-500">{formatPrix(interetBrut||0,devise)} brut — {formatPrix(depensePubEngagee,devise)} pub engagée</p>
                                </div>
                                <span className={`text-xl font-black ${interetNet>=0?"text-[#008000] dark:text-[#008000]":"text-red-600 dark:text-red-400"}`}>
                                  {interetNet>=0?"+":""}{formatPrix(interetNet,devise)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <button onClick={()=>navigate(`/boutique/produits/modifier/${p.id}`)} className="w-full text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-center py-1 transition-colors">
                        Modifier ce produit →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </BoutiqueLayout>
  );
}
