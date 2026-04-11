import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getWeekNumber, getMondayOfWeek } from "@/lib/app-utils";
import { useDevise } from "@/lib/devise-context";
import AppLayout from "@/components/AppLayout";
import { TrendingDown, TrendingUp, Calendar, Clock, Filter, ChevronDown } from "lucide-react";
import { getNexoraUser } from "@/lib/nexora-auth";

type TabType = "tout" | "depenses" | "entrees";
type PeriodType = "tout" | "semaine" | "mois" | "annee";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

interface DepenseRow {
  id: string; titre: string; montant: number; devise: string; categorie: string;
  note?: string; date_depense: string; semaine_num?: number; mois_num?: number; annee_num?: number; created_at?: string;
}
interface EntreeRow {
  id: string; titre: string; montant: number; devise: string; categorie: string;
  note?: string; date_entree: string; semaine_num?: number; mois_num?: number; annee_num?: number; created_at?: string;
}

function formatDatetime(dt: string) {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) +
    " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// ── Parse robuste de date (supporte "2025-01-15", "15/01/2025", etc.) ──
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    const attempt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    if (!isNaN(attempt.getTime())) return attempt;
  }
  return null;
}

function getYearFromDate(dateStr: string): number | null {
  const d = parseDate(dateStr);
  return d ? d.getFullYear() : null;
}

function getMonthFromDate(dateStr: string): number | null {
  const d = parseDate(dateStr);
  return d ? d.getMonth() + 1 : null;
}

function getWeekFromDate(dateStr: string): number | null {
  const d = parseDate(dateStr);
  return d ? getWeekNumber(d) : null;
}

export default function HistoriquePage() {
  const [depenses, setDepenses] = useState<DepenseRow[]>([]);
  const { fmtXOF, usdToXof } = useDevise();
  const [entrees, setEntrees]   = useState<EntreeRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<TabType>("tout");
  const [period, setPeriod]     = useState<PeriodType>("tout");
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedWeek, setSelectedWeek]   = useState(getWeekNumber(new Date()));
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const user = getNexoraUser();
    const userId = user?.id;
    if (!userId) { setLoading(false); return; }
    const [depRes, entRes] = await Promise.all([
      supabase.from("depenses").select("*").eq("user_id", userId).order("date_depense", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("entrees").select("*").eq("user_id", userId).order("date_entree", { ascending: false }).order("created_at", { ascending: false }),
    ]);
    setDepenses((depRes.data || []) as any);
    setEntrees((entRes.data || []) as any);
    setLoading(false);
  };

  const fmt   = (v: number) => fmtXOF(v);
  const toXOF = (m: number, dev: string) => {
    if (dev === "USD") return usdToXof(m); // USD stocké → XOF (taux fixe fallback)
    return m;
  };

  // Années disponibles depuis les dates réelles
  const allYears = [...new Set([
    ...depenses.map(d => getYearFromDate(d.date_depense)),
    ...entrees.map(e => getYearFromDate(e.date_entree)),
  ].filter(Boolean))].sort((a, b) => (b || 0) - (a || 0)) as number[];

  // Semaines disponibles pour l'année sélectionnée
  const allWeeks = [...new Set([
    ...depenses.filter(d => getYearFromDate(d.date_depense) === selectedYear).map(d => getWeekFromDate(d.date_depense)),
    ...entrees.filter(e => getYearFromDate(e.date_entree) === selectedYear).map(e => getWeekFromDate(e.date_entree)),
  ].filter(Boolean))].sort((a, b) => (b || 0) - (a || 0)) as number[];

  // ── Filtre basé sur la date réelle parsée ──
  const filterByDate = (dateStr: string) => {
    if (period === "tout") return true;
    const year  = getYearFromDate(dateStr);
    const month = getMonthFromDate(dateStr);
    const week  = getWeekFromDate(dateStr);
    if (period === "annee")   return year === selectedYear;
    if (period === "mois")    return year === selectedYear && month === selectedMonth;
    if (period === "semaine") return year === selectedYear && week === selectedWeek;
    return true;
  };

  const filteredDepenses = depenses.filter(d => filterByDate(d.date_depense));
  const filteredEntrees  = entrees.filter(e => filterByDate(e.date_entree));

  const totalDepenses = filteredDepenses.reduce((s, d) => s + toXOF(Number(d.montant), d.devise), 0);
  const totalEntrees  = filteredEntrees.reduce((s, e) => s + toXOF(Number(e.montant), e.devise), 0);
  const solde = totalEntrees - totalDepenses;

  function groupByDate<T>(items: T[], dateKey: keyof T) {
    const groups: Record<string, T[]> = {};
    items.forEach(item => {
      const date = String((item as any)[dateKey] || "");
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }

  const depensesByDate = groupByDate(filteredDepenses, "date_depense" as keyof DepenseRow);
  const entreesByDate  = groupByDate(filteredEntrees,  "date_entree"  as keyof EntreeRow);

  const toggleGroup = (key: string) => setExpandedGroups(prev => ({ ...prev, [key]: prev[key] === false }));
  const isGroupOpen = (key: string) => expandedGroups[key] !== false;

  const periodLabel =
    period === "tout"    ? `Tout — ${filteredDepenses.length + filteredEntrees.length} transaction(s)` :
    period === "semaine" ? `Semaine ${selectedWeek} — ${selectedYear}` :
    period === "mois"    ? `${MONTHS[selectedMonth - 1]} ${selectedYear}` :
                           `Année ${selectedYear}`;

  const renderDateLabel = (date: string) => {
    const d = parseDate(date);
    return d ? d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) : date;
  };

  return (
    <AppLayout>
      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <h1 className="font-display font-bold text-xl flex items-center gap-2">
              <Calendar className="w-6 h-6 text-primary" /> Historique
            </h1>
            <p className="text-sm text-muted-foreground">Toutes vos transactions passées</p>
          </div>
          <span className="text-xs text-muted-foreground hidden">devise globale</span>
        </div>

        {/* ── Filtres de période ── */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["tout", "semaine", "mois", "annee"] as PeriodType[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${period === p ? "bg-primary text-primary-foreground shadow" : "bg-secondary text-secondary-foreground hover:bg-primary/10"}`}>
                {p === "tout" ? "🗂️ Tout" : p === "semaine" ? "📅 Semaine" : p === "mois" ? "📆 Mois" : "🗓️ Année"}
              </button>
            ))}
          </div>

          {period !== "tout" && (
            <div className="flex flex-wrap gap-2 items-center">
              {period === "semaine" && (
                <select value={selectedWeek} onChange={e => setSelectedWeek(Number(e.target.value))}
                  className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
                  {allWeeks.length > 0
                    ? allWeeks.map(w => {
                        const mon = getMondayOfWeek(w, selectedYear);
                        return <option key={w} value={w}>Semaine {w} — {mon.toLocaleDateString("fr-FR")}</option>;
                      })
                    : <option value={selectedWeek}>Semaine {selectedWeek}</option>}
                </select>
              )}
              {period === "mois" && (
                <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              )}
              <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
                {allYears.length > 0
                  ? allYears.map(y => <option key={y} value={y}>{y}</option>)
                  : <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-primary bg-primary/5 px-3 py-1.5 rounded-full border border-primary/20">
              {periodLabel}
            </span>
            {period !== "tout" && filteredDepenses.length + filteredEntrees.length === 0 && (
              <button onClick={() => setPeriod("tout")} className="text-xs text-primary font-semibold hover:underline">
                ← Voir tout
              </button>
            )}
          </div>
        </div>

        {/* ── Résumé ── */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex flex-col items-center gap-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <div className="text-xs text-muted-foreground">Entrées</div>
            <div className="font-black text-green-700 text-sm text-center">{fmt(totalEntrees)}</div>
            <div className="text-xs text-muted-foreground">{filteredEntrees.length} op.</div>
          </div>
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex flex-col items-center gap-1">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <div className="text-xs text-muted-foreground">Dépenses</div>
            <div className="font-black text-destructive text-sm text-center">{fmt(totalDepenses)}</div>
            <div className="text-xs text-muted-foreground">{filteredDepenses.length} op.</div>
          </div>
          <div className={`${solde >= 0 ? "bg-green-50 border-green-200" : "bg-destructive/5 border-destructive/20"} border rounded-xl p-3 flex flex-col items-center gap-1`}>
            <div className={`text-sm font-black ${solde >= 0 ? "text-green-700" : "text-destructive"}`}>{solde >= 0 ? "+" : "-"}</div>
            <div className="text-xs text-muted-foreground">Solde</div>
            <div className={`font-black text-sm text-center ${solde >= 0 ? "text-green-700" : "text-destructive"}`}>{fmt(Math.abs(solde))}</div>
          </div>
        </div>

        {/* ── Onglets type ── */}
        <div className="flex gap-2">
          {(["tout", "depenses", "entrees"] as TabType[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-all ${tab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-primary/10"}`}>
              {t === "tout"     && <Filter className="w-3.5 h-3.5" />}
              {t === "depenses" && <TrendingDown className="w-3.5 h-3.5" />}
              {t === "entrees"  && <TrendingUp className="w-3.5 h-3.5" />}
              {t === "tout" ? "Tout" : t === "depenses" ? "Dépenses" : "Entrées"}
            </button>
          ))}
        </div>

        {/* ── Contenu ── */}
        {loading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">Chargement...</div>
        ) : (
          <div className="space-y-3">

            {/* DÉPENSES */}
            {tab !== "entrees" && (
              <div>
                {tab === "tout" && depensesByDate.length > 0 && (
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-destructive">
                    <TrendingDown className="w-4 h-4" /> Dépenses ({filteredDepenses.length})
                  </h3>
                )}
                {depensesByDate.length === 0 ? (
                  <div className="text-center p-6 text-muted-foreground bg-card border border-border rounded-xl text-sm">
                    Aucune dépense{period !== "tout" ? ` pour ${MONTHS[selectedMonth-1]} ${selectedYear}` : ""}
                  </div>
                ) : depensesByDate.map(([date, items]) => {
                  const key = `dep-${date}`;
                  const isOpen = isGroupOpen(key);
                  const dayTotal = items.reduce((s, d: any) => s + toXOF(Number(d.montant), d.devise), 0);
                  return (
                    <div key={key} className="bg-card border border-border rounded-xl overflow-hidden mb-2">
                      <button onClick={() => toggleGroup(key)}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                        <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-semibold text-sm capitalize flex-1 truncate">{renderDateLabel(date)}</span>
                        <span className="text-destructive font-bold text-sm whitespace-nowrap">{fmt(dayTotal)}</span>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isOpen && (
                        <div className="divide-y divide-border">
                          {(items as DepenseRow[]).map(d => (
                            <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                              <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                                <TrendingDown className="w-4 h-4 text-destructive" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{d.titre}</div>
                                <div className="text-xs text-muted-foreground">
                                  {d.categorie}{d.categorie ? " • " : ""}
                                  {d.created_at ? formatDatetime(d.created_at) : d.date_depense}
                                </div>
                                {d.note && <div className="text-xs text-muted-foreground italic">📝 {d.note}</div>}
                              </div>
                              <div className="text-sm font-bold text-destructive whitespace-nowrap">
                                -{fmt(toXOF(Number(d.montant), d.devise))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ENTRÉES */}
            {tab !== "depenses" && (
              <div>
                {tab === "tout" && entreesByDate.length > 0 && (
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-green-700">
                    <TrendingUp className="w-4 h-4" /> Entrées ({filteredEntrees.length})
                  </h3>
                )}
                {entreesByDate.length === 0 ? (
                  <div className="text-center p-6 text-muted-foreground bg-card border border-border rounded-xl text-sm">
                    Aucune entrée{period !== "tout" ? ` pour ${MONTHS[selectedMonth-1]} ${selectedYear}` : ""}
                  </div>
                ) : entreesByDate.map(([date, items]) => {
                  const key = `ent-${date}`;
                  const isOpen = isGroupOpen(key);
                  const dayTotal = items.reduce((s, e: any) => s + toXOF(Number(e.montant), e.devise), 0);
                  return (
                    <div key={key} className="bg-card border border-border rounded-xl overflow-hidden mb-2">
                      <button onClick={() => toggleGroup(key)}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-green-50/50 hover:bg-green-50 transition-colors text-left">
                        <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-semibold text-sm capitalize flex-1 truncate">{renderDateLabel(date)}</span>
                        <span className="text-green-700 font-bold text-sm whitespace-nowrap">{fmt(dayTotal)}</span>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isOpen && (
                        <div className="divide-y divide-border">
                          {(items as EntreeRow[]).map(e => (
                            <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                <TrendingUp className="w-4 h-4 text-green-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{e.titre}</div>
                                <div className="text-xs text-muted-foreground">
                                  {e.categorie}{e.categorie ? " • " : ""}
                                  {e.created_at ? formatDatetime(e.created_at) : e.date_entree}
                                </div>
                                {e.note && <div className="text-xs text-muted-foreground italic">📝 {e.note}</div>}
                              </div>
                              <div className="text-sm font-bold text-green-700 whitespace-nowrap">
                                +{fmt(toXOF(Number(e.montant), e.devise))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Vide total */}
            {filteredDepenses.length === 0 && filteredEntrees.length === 0 && (
              <div className="text-center p-8 text-muted-foreground bg-card border border-border rounded-xl">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">
                  Aucune transaction{period !== "tout" ? ` pour ${periodLabel.toLowerCase()}` : ""}.
                </p>
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
