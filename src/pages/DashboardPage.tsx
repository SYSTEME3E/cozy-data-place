import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { convertAmount } from "@/lib/app-utils";
import { useDevise, DEVISES_LISTE } from "@/lib/devise-context";
import AppLayout from "@/components/AppLayout";
import {
  TrendingUp, TrendingDown, History, Clock,
  ArrowUpRight, Store,
  Wallet, RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";
import { getNexoraUser } from "@/lib/nexora-auth";


function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function getDateStr() {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long", year: "numeric",
    month: "long", day: "numeric"
  });
}

// ── BOUTON WHATSAPP FLOTTANT ──────────────────────────────────────────────────
function WhatsAppFloatingButton() {
  const [visible, setVisible] = useState(false);

  // Apparition différée pour un effet "slide-up" après le chargement de la page
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @keyframes wa-slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.85); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @keyframes wa-pulse {
          0%, 100% { box-shadow: 0 0 0 0   rgba(37,211,102,0.55), 0 6px 24px rgba(37,211,102,0.35); }
          60%       { box-shadow: 0 0 0 14px rgba(37,211,102,0),   0 6px 24px rgba(37,211,102,0.35); }
        }
        @keyframes wa-tooltipIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }

        .wa-wrapper {
          position: fixed;
          bottom: 28px;
          right: 24px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
          pointer-events: none;
        }
        .wa-wrapper.is-visible { pointer-events: auto; }

        /* ── Tooltip ── */
        .wa-tooltip {
          background: #ffffff;
          color: #1a1a1a;
          font-size: 12.5px;
          font-weight: 700;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          padding: 8px 14px;
          border-radius: 14px;
          white-space: nowrap;
          box-shadow: 0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08);
          opacity: 0;
          transform: translateY(6px);
          transition: opacity 0.22s ease, transform 0.22s ease;
          position: relative;
          margin-right: 4px;
          letter-spacing: 0.01em;
        }
        /* Petite flèche */
        .wa-tooltip::after {
          content: '';
          position: absolute;
          bottom: -6px;
          right: 24px;
          width: 12px;
          height: 12px;
          background: #ffffff;
          transform: rotate(45deg);
          border-radius: 2px;
          box-shadow: 2px 2px 5px rgba(0,0,0,0.06);
        }

        /* ── Bouton principal ── */
        .wa-btn {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #25D366 0%, #128C5E 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: none;
          text-decoration: none;
          flex-shrink: 0;
          animation: wa-pulse 2.4s ease-in-out 1.8s infinite;
          transition: transform 0.25s cubic-bezier(.34,1.56,.64,1);
          position: relative;
          overflow: visible;
        }

        /* Anneau blanc subtil */
        .wa-btn::before {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          border: 2px solid rgba(37,211,102,0.3);
          pointer-events: none;
        }

        .wa-btn:hover {
          transform: scale(1.12);
          animation: none;
          box-shadow: 0 8px 32px rgba(37,211,102,0.5), 0 4px 12px rgba(0,0,0,0.15);
        }
        .wa-btn:hover + .wa-tooltip,
        .wa-wrapper:hover .wa-tooltip {
          opacity: 1;
          transform: translateY(0);
        }

        /* Apparition globale du wrapper */
        .wa-wrapper.is-visible .wa-btn {
          animation: wa-slideUp 0.55s cubic-bezier(.22,.68,0,1.15) both,
                     wa-pulse   2.4s ease-in-out 2.4s infinite;
        }

        /* Responsive mobile */
        @media (max-width: 640px) {
          .wa-wrapper { bottom: 20px; right: 16px; }
          .wa-btn     { width: 52px; height: 52px; }
          .wa-tooltip { font-size: 11.5px; padding: 7px 12px; }
        }
      `}</style>

      <div className={`wa-wrapper${visible ? " is-visible" : ""}`}>
        {/* Tooltip au-dessus */}
        <div className="wa-tooltip">💬 Rejoignez la communauté</div>

        {/* Bouton */}
        <a
          href="https://chat.whatsapp.com/BCBOcRIFGr6LoRPyMiXRAp"
          target="_blank"
          rel="noopener noreferrer"
          className="wa-btn"
          aria-label="Rejoindre la communauté WhatsApp"
        >
          {/* Icône communauté (groupe de personnes) */}
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="9.5" r="4" fill="white"/>
            <path d="M8 27c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="white" strokeWidth="2.3" strokeLinecap="round"/>
            <circle cx="6.5"  cy="12" r="3" fill="white" opacity="0.72"/>
            <path d="M1 27c0-3.314 2.686-6 5.5-6" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.72"/>
            <circle cx="25.5" cy="12" r="3" fill="white" opacity="0.72"/>
            <path d="M31 27c0-3.314-2.686-6-5.5-6" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.72"/>
          </svg>
        </a>
      </div>
    </>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { devise, setDevise, fmtXOF, ratesFresh, lastUpdated, ratesLoading } = useDevise();
  const [time, setTime]       = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [stats, setStats]     = useState({
    totalEntrees: 0,
    totalDepenses: 0,
    dernièresDepenses: [] as any[],
    dernièresEntrees:  [] as any[],
  });

  const nexoraUser  = getNexoraUser();
  const displayName = nexoraUser?.nom_prenom?.split(" ")[0] || "Eric";

  useEffect(() => {
    loadStats();
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadStats = async () => {
    setLoading(true);
    const toXOF = (m: number, dev: string) =>
      dev === "USD" ? convertAmount(m, "USD", "XOF") : m;

    const userId = nexoraUser?.id;
    if (!userId) { setLoading(false); return; }

    const [depResult, entResult] = await Promise.all([
      supabase.from("depenses" as any).select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("entrees"  as any).select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    ]);

    const deps = depResult.data || [];
    const ents = entResult.data || [];

    const totalEntrees  = ents.reduce((s: number, e: any) => s + toXOF(Number(e.montant), e.devise), 0);
    const totalDepenses = deps.reduce((s: number, d: any) => s + toXOF(Number(d.montant), d.devise), 0);

    setStats({
      totalEntrees,
      totalDepenses,
      dernièresDepenses: deps.slice(0, 4),
      dernièresEntrees:  ents.slice(0, 4),
    });
    setLoading(false);
  };

  const fmt   = (v: number) => fmtXOF(v);
  const solde = stats.totalEntrees - stats.totalDepenses;

  const headerActions = (
    <button
      onClick={loadStats}
      className="p-2 rounded-xl border transition-all bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
      title="Actualiser"
    >
      <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
    </button>
  );

  return (
    <AppLayout headerActions={headerActions}>
      <div className="w-full flex flex-col gap-4 pb-6">

        {/* ── 1. HERO CARD ── */}
        <div className="relative overflow-hidden rounded-3xl p-6 border-2 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 border-violet-500/30 shadow-xl shadow-violet-500/20">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 w-36 h-36 bg-indigo-400/10 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black mb-1 text-white tracking-tight">
                  {getGreeting()}, {displayName} ! 👋
                </h1>
                <p className="text-sm font-medium capitalize text-violet-200">
                  {getDateStr()}
                </p>
              </div>
              <select
                value={devise}
                onChange={(e) => setDevise(e.target.value as any)}
                className="rounded-xl px-3 py-2 font-bold text-xs outline-none border bg-white/10 border-white/20 text-white backdrop-blur-sm cursor-pointer max-w-[140px]"
              >
                {DEVISES_LISTE.map(d => (
                  <option key={d.code} value={d.code} className="text-slate-900 bg-white">
                    {d.code} — {d.symbole}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white/10 w-fit px-4 py-1.5 rounded-2xl border border-white/15 backdrop-blur-sm">
              <Clock className="w-4 h-4 text-yellow-300" />
              <span className="text-yellow-300 font-mono font-bold text-xs tracking-widest">
                {time.toLocaleTimeString("fr-FR")}
              </span>
            </div>

            {/* Indicateur taux de change */}
            <div className="flex items-center gap-2 text-[10px]">
              {ratesLoading ? (
                <span className="text-white/40 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  Mise à jour des taux...
                </span>
              ) : ratesFresh ? (
                <span className="text-emerald-400/80 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Taux live {lastUpdated ? `· ${lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}
                </span>
              ) : (
                <span className="text-yellow-400/70 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  Taux indicatifs (hors-ligne)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── 2. SOLDE NET ── */}
        <div className={`rounded-3xl p-5 flex items-center gap-4 border transition-all ${
          solde >= 0
            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 shadow-sm shadow-emerald-100 dark:shadow-none"
            : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50 shadow-sm shadow-red-100 dark:shadow-none"
        }`}>
          <div className={`p-3.5 rounded-2xl ${
            solde >= 0
              ? "bg-emerald-100 dark:bg-emerald-900/50"
              : "bg-red-100 dark:bg-red-900/50"
          }`}>
            <Wallet className={`w-7 h-7 ${solde >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`} />
          </div>
          <div>
            <p className={`text-xs font-black uppercase tracking-widest mb-0.5 ${
              solde >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
            }`}>Solde net total</p>
            <h2 className={`text-3xl font-black tracking-tight ${
              solde >= 0
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-red-600 dark:text-red-400"
            }`}>
              {loading
                ? <span className="text-muted-foreground text-lg animate-pulse">Chargement...</span>
                : fmt(solde)
              }
            </h2>
          </div>
        </div>

        {/* ── 3. CARTES ACTIONS ── */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/entrees-depenses"
            className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-3xl shadow-lg shadow-emerald-500/25 hover:scale-[1.02] hover:shadow-emerald-500/40 transition-all active:scale-[0.98]"
          >
            <div className="bg-white/15 p-2.5 w-fit rounded-xl mb-3 border border-white/20">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <p className="text-emerald-100 font-bold text-[10px] uppercase tracking-wider mb-1">Entrées</p>
            <p className="text-white font-black text-xl truncate">{loading ? "..." : fmt(stats.totalEntrees)}</p>
          </Link>

          <Link
            to="/entrees-depenses"
            className="bg-gradient-to-br from-rose-500 to-red-600 p-4 rounded-3xl shadow-lg shadow-rose-500/25 hover:scale-[1.02] hover:shadow-rose-500/40 transition-all active:scale-[0.98]"
          >
            <div className="bg-white/15 p-2.5 w-fit rounded-xl mb-3 border border-white/20">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
            <p className="text-rose-100 font-bold text-[10px] uppercase tracking-wider mb-1">Dépenses</p>
            <p className="text-white font-black text-xl truncate">{loading ? "..." : fmt(stats.totalDepenses)}</p>
          </Link>

          <Link
            to="/transfert"
            className="bg-gradient-to-br from-amber-400 to-orange-500 p-4 rounded-3xl shadow-lg shadow-amber-500/25 hover:scale-[1.02] hover:shadow-amber-500/40 transition-all active:scale-[0.98]"
          >
            <div className="bg-white/15 p-2.5 w-fit rounded-xl mb-3 border border-white/20">
              <ArrowUpRight className="w-6 h-6 text-white" />
            </div>
            <p className="text-amber-100 font-bold text-[10px] uppercase tracking-wider mb-1">Transfert</p>
            <p className="text-white font-black text-xl">Suivi →</p>
          </Link>

          <Link
            to="/boutique"
            className="bg-gradient-to-br from-violet-600 to-indigo-700 p-4 rounded-3xl shadow-lg shadow-violet-500/25 hover:scale-[1.02] hover:shadow-violet-500/40 transition-all active:scale-[0.98]"
          >
            <div className="bg-white/15 p-2.5 w-fit rounded-xl mb-3 border border-white/20">
              <Store className="w-6 h-6 text-white" />
            </div>
            <p className="text-violet-200 font-bold text-[10px] uppercase tracking-wider mb-1">Boutique</p>
            <p className="text-white font-black text-xl">Gérer →</p>
          </Link>
        </div>

        {/* ── 4. TRANSACTIONS RÉCENTES ── */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-bold text-sm flex items-center gap-2 text-foreground">
              <History className="w-4 h-4 text-violet-500" />
              Transactions récentes
            </h3>
            <Link
              to="/historique"
              className="text-violet-500 text-xs font-black hover:text-violet-400 tracking-tight transition-colors"
            >
              VOIR TOUT →
            </Link>
          </div>

          <div className="rounded-3xl overflow-hidden border bg-card border-border shadow-sm">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-xs font-medium animate-pulse">
                Chargement des données...
              </div>
            ) : [...stats.dernièresEntrees, ...stats.dernièresDepenses].length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs font-medium">
                Aucune activité récente
              </div>
            ) : (
              <div className="divide-y divide-border">
                {stats.dernièresEntrees.slice(0, 2).map((e, i) => (
                  <div key={`ent-${i}`} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-500/10 p-2 rounded-xl">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-xs font-black truncate max-w-[140px] text-foreground">{e.titre}</p>
                        <p className="text-muted-foreground text-[10px] mt-0.5">{e.date_entree}</p>
                      </div>
                    </div>
                    <span className="text-emerald-500 font-black text-xs">+{fmt(e.montant)}</span>
                  </div>
                ))}
                {stats.dernièresDepenses.slice(0, 2).map((d, i) => (
                  <div key={`dep-${i}`} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-rose-500/10 p-2 rounded-xl">
                        <TrendingDown className="w-4 h-4 text-rose-500" />
                      </div>
                      <div>
                        <p className="text-xs font-black truncate max-w-[140px] text-foreground">{d.titre}</p>
                        <p className="text-muted-foreground text-[10px] mt-0.5">{d.date_depense}</p>
                      </div>
                    </div>
                    <span className="text-rose-500 font-black text-xs">-{fmt(d.montant)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── BOUTON WHATSAPP FLOTTANT ── */}
      <WhatsAppFloatingButton />
    </AppLayout>
  );
}
