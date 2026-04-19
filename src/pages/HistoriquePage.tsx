/**
 * NEXORA — Historique MLM
 * Onglets : Commissions | Bonus | Retraits
 * Filtres période + conversion devise globale
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getWeekNumber, getMondayOfWeek } from "@/lib/app-utils";
import { useDevise } from "@/lib/devise-context";
import AppLayout from "@/components/AppLayout";
import { getNexoraUser } from "@/lib/nexora-auth";
import { formatMontant, getLevelLabel, getCommissionTypeLabel } from "@/lib/mlm-utils";
import {
  Calendar, Clock, ChevronDown,
  DollarSign, Gift, Users, BookOpen,
  ArrowDownToLine, TrendingUp, Wallet,
  CheckCircle, AlertCircle, Hourglass
} from "lucide-react";

type TabType = "tout" | "commissions" | "bonus" | "retraits";
type PeriodType = "tout" | "semaine" | "mois" | "annee";

const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

interface CommissionRow {
  id: string;
  amount: number;
  currency: string;
  type: string;
  level: number;
  status: string;
  created_at: string;
  from_user?: { nom_prenom: string; username: string };
}
interface BonusRow {
  id: string;
  montant: number;
  currency: string;
  type_bonus: string;
  description?: string;
  status: string;
  created_at: string;
}
interface RetraitRow {
  id: string;
  amount: number;
  currency: string;
  methode: string;
  pays?: string;
  reseau?: string;
  telephone?: string;
  status: string;
  note_admin?: string;
  created_at: string;
}

function formatDatetime(dt: string) {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) +
    " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  return null;
}

const getYear  = (s: string) => { const d = parseDate(s); return d ? d.getFullYear() : null; };
const getMonth = (s: string) => { const d = parseDate(s); return d ? d.getMonth() + 1 : null; };
const getWeek  = (s: string) => { const d = parseDate(s); return d ? getWeekNumber(d) : null; };

function groupByDay<T>(items: T[], dateKey: keyof T) {
  const groups: Record<string, T[]> = {};
  items.forEach(item => {
    const raw = String((item as any)[dateKey] || "");
    const d = parseDate(raw);
    const key = d ? d.toISOString().slice(0, 10) : raw;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

const getLevelColor = (level: number) => {
  if (level === 0) return "text-amber-400 bg-amber-400/10";
  if (level === 1) return "text-emerald-400 bg-emerald-400/10";
  if (level === 2) return "text-blue-400 bg-blue-400/10";
  return "text-purple-400 bg-purple-400/10";
};

const getBonusIcon = (type: string) => {
  if (type === "parrainage") return <Users className="w-4 h-4 text-emerald-400" />;
  if (type === "rang")       return <TrendingUp className="w-4 h-4 text-amber-400" />;
  if (type === "welcome")    return <Gift className="w-4 h-4 text-primary" />;
  return <Gift className="w-4 h-4 text-purple-400" />;
};

const getBonusColor = (type: string) => {
  if (type === "parrainage") return "bg-emerald-400/10";
  if (type === "rang")       return "bg-amber-400/10";
  if (type === "welcome")    return "bg-primary/10";
  return "bg-purple-400/10";
};

const getStatusBadge = (status: string) => {
  if (["credited","confirmed","completed","paid"].includes(status))
    return <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500"><CheckCircle className="w-2.5 h-2.5"/>Crédité</span>;
  if (["rejected","cancelled","failed"].includes(status))
    return <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive"><AlertCircle className="w-2.5 h-2.5"/>Annulé</span>;
  return <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"><Hourglass className="w-2.5 h-2.5"/>En attente</span>;
};

export default function HistoriquePage() {
  const { fmtXOF, devise } = useDevise();
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [bonus,       setBonus]       = useState<BonusRow[]>([]);
  const [retraits,    setRetraits]    = useState<RetraitRow[]>([]);
  const [loading,     setLoading]     = useState(true);

  const [tab,    setTab]    = useState<TabType>("tout");
  const [period, setPeriod] = useState<PeriodType>("tout");
  const [selectedYear,  setSelectedYear]  = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedWeek,  setSelectedWeek]  = useState(getWeekNumber(new Date()));
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const user = getNexoraUser();
    const userId = user?.id;
    if (!userId) { setLoading(false); return; }

    const [commRes, bonusRes, retraitRes] = await Promise.all([
      (supabase as any).from("mlm_commissions")
        .select("*, from_user:from_user_id(nom_prenom, username)")
        .eq("to_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(300),
      (supabase as any).from("historique_bonus")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200),
      (supabase as any).from("mlm_withdrawals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    setCommissions(commRes.data || []);
    setBonus(bonusRes.data || []);
    setRetraits(retraitRes.data || []);
    setLoading(false);
  };

  // Années disponibles
  const allDates = [
    ...commissions.map(c => c.created_at),
    ...bonus.map(b => b.created_at),
    ...retraits.map(r => r.created_at),
  ];
  const allYears = [...new Set(allDates.map(d => getYear(d)).filter(Boolean))].sort((a, b) => (b||0)-(a||0)) as number[];

  const filterByDate = (dateStr: string) => {
    if (period === "tout") return true;
    const y = getYear(dateStr), m = getMonth(dateStr), w = getWeek(dateStr);
    if (period === "annee")   return y === selectedYear;
    if (period === "mois")    return y === selectedYear && m === selectedMonth;
    if (period === "semaine") return y === selectedYear && w === selectedWeek;
    return true;
  };

  const filtComm    = commissions.filter(c => filterByDate(c.created_at));
  const filtBonus   = bonus.filter(b => filterByDate(b.created_at));
  const filtRetraits = retraits.filter(r => filterByDate(r.created_at));

  const totalComm    = filtComm.reduce((s, c) => s + Number(c.amount), 0);
  const totalBonus   = filtBonus.reduce((s, b) => s + Number(b.montant), 0);
  const totalRetraits = filtRetraits.reduce((s, r) => s + Number(r.amount), 0);
  const totalGagné   = totalComm + totalBonus;

  const toggleGroup = (key: string) => setExpandedGroups(prev => ({ ...prev, [key]: prev[key] === false }));
  const isOpen = (key: string) => expandedGroups[key] !== false;

  const renderDateLabel = (date: string) => {
    const d = parseDate(date);
    return d ? d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) : date;
  };

  const periodLabel =
    period === "tout"    ? "Tout l'historique" :
    period === "semaine" ? `Sem. ${selectedWeek} — ${selectedYear}` :
    period === "mois"    ? `${MONTHS[selectedMonth - 1]} ${selectedYear}` :
    `Année ${selectedYear}`;

  const tabs: { key: TabType; label: string; icon: React.ReactNode; count: number; color: string }[] = [
    { key: "tout",        label: "Tout",        icon: <Wallet className="w-3.5 h-3.5"/>,          count: filtComm.length + filtBonus.length + filtRetraits.length, color: "text-foreground" },
    { key: "commissions", label: "Commissions", icon: <DollarSign className="w-3.5 h-3.5"/>,      count: filtComm.length,    color: "text-emerald-400" },
    { key: "bonus",       label: "Bonus",       icon: <Gift className="w-3.5 h-3.5"/>,             count: filtBonus.length,   color: "text-amber-400" },
    { key: "retraits",    label: "Retraits",    icon: <ArrowDownToLine className="w-3.5 h-3.5"/>, count: filtRetraits.length, color: "text-blue-400" },
  ];

  return (
    <AppLayout>
      <div className="space-y-4 pb-8">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <h1 className="font-display font-bold text-xl flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Historique MLM
            </h1>
            <p className="text-xs text-muted-foreground">Commissions, bonus et retraits • {devise}</p>
          </div>
        </div>

        {/* Cartes résumé */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs text-muted-foreground">Commissions</span>
            </div>
            <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{fmtXOF(totalComm)}</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Gift className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs text-muted-foreground">Bonus</span>
            </div>
            <p className="font-black text-amber-600 dark:text-amber-400 text-sm">{fmtXOF(totalBonus)}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowDownToLine className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs text-muted-foreground">Retraits</span>
            </div>
            <p className="font-black text-blue-600 dark:text-blue-400 text-sm">{fmtXOF(totalRetraits)}</p>
          </div>
        </div>

        {/* Total gagné */}
        <div className="rounded-xl p-3 flex items-center justify-between border bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/20 dark:to-amber-950/20 border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-muted-foreground">Total gagné (commissions + bonus)</span>
          </div>
          <span className="font-black text-sm text-emerald-700 dark:text-emerald-400">
            +{fmtXOF(totalGagné)}
          </span>
        </div>

        {/* Filtres période */}
        <div className="bg-card border border-border rounded-xl p-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {(["tout","semaine","mois","annee"] as PeriodType[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${period === p ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-secondary-foreground hover:bg-primary/10"}`}>
                {p === "tout" ? "🗂️ Tout" : p === "semaine" ? "📅 Semaine" : p === "mois" ? "📆 Mois" : "🗓️ Année"}
              </button>
            ))}
          </div>

          {period !== "tout" && (
            <div className="flex flex-wrap gap-2">
              {period === "semaine" && (
                <select value={selectedWeek} onChange={e => setSelectedWeek(Number(e.target.value))}
                  className="border border-border rounded-lg px-2 py-1.5 text-xs bg-card">
                  {(allYears.length > 0 ? Array.from({length:52},(_,i)=>i+1) : [selectedWeek]).map(w => (
                    <option key={w} value={w}>Semaine {w}</option>
                  ))}
                </select>
              )}
              {period === "mois" && (
                <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="border border-border rounded-lg px-2 py-1.5 text-xs bg-card">
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              )}
              <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                className="border border-border rounded-lg px-2 py-1.5 text-xs bg-card">
                {(allYears.length > 0 ? allYears : [new Date().getFullYear()]).map(y =>
                  <option key={y} value={y}>{y}</option>
                )}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/20">
              {periodLabel}
            </span>
            {period !== "tout" && (
              <button onClick={() => setPeriod("tout")} className="text-xs text-primary font-semibold hover:underline">
                ← Tout voir
              </button>
            )}
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${tab === t.key ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border text-muted-foreground hover:bg-primary/5"}`}>
              <span className={tab === t.key ? "" : t.color}>{t.icon}</span>
              {t.label}
              {t.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="p-10 text-center text-muted-foreground animate-pulse text-sm">Chargement...</div>
        ) : (
          <div className="space-y-4">

            {/* ── COMMISSIONS ── */}
            {(tab === "tout" || tab === "commissions") && (
              <section>
                {tab === "tout" && filtComm.length > 0 && (
                  <h3 className="font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2 text-emerald-500">
                    <DollarSign className="w-3.5 h-3.5" /> Commissions ({filtComm.length})
                  </h3>
                )}
                {filtComm.length === 0 ? (
                  tab === "commissions" && <EmptyState icon={<DollarSign className="w-8 h-8"/>} label="Aucune commission" sub="Parrainez des membres pour gagner des commissions" />
                ) : groupByDay(filtComm, "created_at").map(([date, items]) => {
                  const key = `comm-${date}`;
                  const dayTotal = items.reduce((s, c: any) => s + Number(c.amount), 0);
                  return (
                    <GroupCard key={key} groupKey={key} label={renderDateLabel(date)}
                      amount={`+${fmtXOF(dayTotal)}`} amountColor="text-emerald-500"
                      isOpen={isOpen(key)} toggle={() => toggleGroup(key)} bgClass="bg-emerald-50/50 dark:bg-emerald-950/10">
                      {(items as CommissionRow[]).map(c => (
                        <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${c.type === "subscription" ? "bg-blue-400/10" : "bg-amber-400/10"}`}>
                            {c.type === "subscription"
                              ? <Users className="w-4 h-4 text-blue-400" />
                              : <BookOpen className="w-4 h-4 text-amber-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-semibold">{getCommissionTypeLabel(c.type)}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${getLevelColor(c.level)}`}>
                                {getLevelLabel(c.level)}
                              </span>
                              {getStatusBadge(c.status)}
                            </div>
                            {c.from_user && (
                              <p className="text-xs text-muted-foreground">
                                De : {(c.from_user as any).nom_prenom}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">{formatDatetime(c.created_at)}</p>
                          </div>
                          <div className="font-black text-emerald-400 text-sm whitespace-nowrap">
                            +{fmtXOF(Number(c.amount))}
                          </div>
                        </div>
                      ))}
                    </GroupCard>
                  );
                })}
              </section>
            )}

            {/* ── BONUS ── */}
            {(tab === "tout" || tab === "bonus") && (
              <section>
                {tab === "tout" && filtBonus.length > 0 && (
                  <h3 className="font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2 text-amber-500">
                    <Gift className="w-3.5 h-3.5" /> Bonus ({filtBonus.length})
                  </h3>
                )}
                {filtBonus.length === 0 ? (
                  tab === "bonus" && <EmptyState icon={<Gift className="w-8 h-8"/>} label="Aucun bonus" sub="Les bonus de parrainage et de rang apparaîtront ici" />
                ) : groupByDay(filtBonus, "created_at").map(([date, items]) => {
                  const key = `bon-${date}`;
                  const dayTotal = items.reduce((s, b: any) => s + Number(b.montant), 0);
                  return (
                    <GroupCard key={key} groupKey={key} label={renderDateLabel(date)}
                      amount={`+${fmtXOF(dayTotal)}`} amountColor="text-amber-500"
                      isOpen={isOpen(key)} toggle={() => toggleGroup(key)} bgClass="bg-amber-50/50 dark:bg-amber-950/10">
                      {(items as BonusRow[]).map(b => (
                        <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${getBonusColor(b.type_bonus)}`}>
                            {getBonusIcon(b.type_bonus)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-semibold capitalize">
                                {b.type_bonus === "parrainage" ? "Bonus parrainage"
                                  : b.type_bonus === "rang" ? "Bonus de rang"
                                  : b.type_bonus === "welcome" ? "Bonus de bienvenue"
                                  : b.type_bonus}
                              </span>
                              {getStatusBadge(b.status)}
                            </div>
                            {b.description && <p className="text-xs text-muted-foreground">{b.description}</p>}
                            <p className="text-xs text-muted-foreground">{formatDatetime(b.created_at)}</p>
                          </div>
                          <div className="font-black text-amber-500 text-sm whitespace-nowrap">
                            +{fmtXOF(Number(b.montant))}
                          </div>
                        </div>
                      ))}
                    </GroupCard>
                  );
                })}
              </section>
            )}

            {/* ── RETRAITS ── */}
            {(tab === "tout" || tab === "retraits") && (
              <section>
                {tab === "tout" && filtRetraits.length > 0 && (
                  <h3 className="font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2 text-blue-400">
                    <ArrowDownToLine className="w-3.5 h-3.5" /> Retraits ({filtRetraits.length})
                  </h3>
                )}
                {filtRetraits.length === 0 ? (
                  tab === "retraits" && <EmptyState icon={<ArrowDownToLine className="w-8 h-8"/>} label="Aucun retrait" sub="Vos demandes de retrait apparaîtront ici" />
                ) : groupByDay(filtRetraits, "created_at").map(([date, items]) => {
                  const key = `ret-${date}`;
                  const dayTotal = items.reduce((s, r: any) => s + Number(r.amount), 0);
                  return (
                    <GroupCard key={key} groupKey={key} label={renderDateLabel(date)}
                      amount={fmtXOF(dayTotal)} amountColor="text-blue-400"
                      isOpen={isOpen(key)} toggle={() => toggleGroup(key)} bgClass="bg-blue-50/50 dark:bg-blue-950/10">
                      {(items as RetraitRow[]).map(r => (
                        <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-400/10 flex items-center justify-center flex-shrink-0">
                            <ArrowDownToLine className="w-4 h-4 text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-semibold">Retrait {r.methode === "mobile_money" ? "Mobile Money" : r.methode}</span>
                              {getStatusBadge(r.status)}
                            </div>
                            {(r.reseau || r.pays) && (
                              <p className="text-xs text-muted-foreground">
                                {r.reseau}{r.reseau && r.pays ? " • " : ""}{r.pays}
                                {r.telephone ? ` • ${r.telephone}` : ""}
                              </p>
                            )}
                            {r.note_admin && (
                              <p className="text-xs text-muted-foreground italic">📝 {r.note_admin}</p>
                            )}
                            <p className="text-xs text-muted-foreground">{formatDatetime(r.created_at)}</p>
                          </div>
                          <div className="font-black text-blue-400 text-sm whitespace-nowrap">
                            -{fmtXOF(Number(r.amount))}
                          </div>
                        </div>
                      ))}
                    </GroupCard>
                  );
                })}
              </section>
            )}

            {/* Vide total */}
            {filtComm.length === 0 && filtBonus.length === 0 && filtRetraits.length === 0 && (
              <div className="text-center p-10 text-muted-foreground bg-card border border-border rounded-xl">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm font-medium">Aucune transaction pour cette période.</p>
                {period !== "tout" && (
                  <button onClick={() => setPeriod("tout")} className="mt-3 text-xs text-primary font-semibold hover:underline">
                    ← Voir tout l'historique
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

// ── Composants utilitaires ────────────────────────────────────────────────────

function GroupCard({ groupKey, label, amount, amountColor, isOpen, toggle, bgClass, children }: {
  groupKey: string; label: string; amount: string; amountColor: string;
  isOpen: boolean; toggle: () => void; bgClass: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-2">
      <button onClick={toggle} className={`w-full flex items-center gap-3 px-4 py-3 ${bgClass} hover:opacity-90 transition-opacity text-left`}>
        <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="font-semibold text-sm capitalize flex-1 truncate">{label}</span>
        <span className={`font-bold text-sm whitespace-nowrap ${amountColor}`}>{amount}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && <div className="divide-y divide-border/50">{children}</div>}
    </div>
  );
}

function EmptyState({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className="text-center p-10 text-muted-foreground bg-card border border-border rounded-xl">
      <div className="w-12 h-12 mx-auto mb-3 opacity-20 flex items-center justify-center">{icon}</div>
      <p className="text-sm font-semibold">{label}</p>
      {sub && <p className="text-xs mt-1">{sub}</p>}
    </div>
  );
}
