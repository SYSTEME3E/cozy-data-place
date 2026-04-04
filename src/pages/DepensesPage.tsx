import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatAmount, convertAmount, playSuccessSound, getWeekNumber, getMondayOfWeek } from "@/lib/app-utils";
import { getNexoraUser } from "@/lib/nexora-auth";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Download, TrendingDown, Filter, AlertCircle, BarChart2 } from "lucide-react";
import * as XLSX from "xlsx";

type Devise = "XOF" | "USD";
type Period = "jour" | "semaine" | "mois" | "annee" | "historique";

const CATEGORIES = [
  "Alimentation", "Transport", "Santé", "Éducation", "Vêtements",
  "Loisirs", "Logement", "Factures", "Famille", "Téléphone",
  "Internet", "Épargne", "Restaurant", "Voyage", "Carburant",
  "Médicaments", "Courses", "Cadeaux", "Sport", "Électronique",
  "Eau", "Électricité", "Abonnement", "Réparation", "Autre"
];

const MONTHS = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juill.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];

interface Depense {
  id: string; titre: string; montant: number; devise: string;
  categorie: string; note?: string; date_depense: string;
  semaine_num?: number; mois_num?: number; annee_num?: number; created_at?: string;
}

export default function DepensesPage() {
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [devise, setDevise] = useState<Devise>("XOF");
  const [period, setPeriod] = useState<Period>("semaine");
  const [histoPeriod, setHistoPeriod] = useState<"semaine" | "mois" | "annee">("mois");
  const [histoValue, setHistoValue] = useState(new Date().getMonth() + 1);
  const [histoYear, setHistoYear] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const user = getNexoraUser();
  const userId = user?.id;

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const weekNum = getWeekNumber(now);
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [form, setForm] = useState({
    titre: "", montant: "", devise: "XOF" as Devise,
    categorie: "Alimentation", note: "", date_depense: today
  });

  useEffect(() => { if (userId) loadDepenses(); }, [userId]);

  const loadDepenses = async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from("depenses").select("*").eq("user_id", userId).order("date_depense", { ascending: false }).order("created_at", { ascending: false });
    setDepenses(data || []);
    setLoading(false);
  };

  const filtered = depenses.filter(d => {
    const matchSearch = d.titre.toLowerCase().includes(search.toLowerCase()) ||
      d.categorie.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat ? d.categorie === filterCat : true;
    if (!matchSearch || !matchCat) return false;
    if (period === "jour") return d.date_depense === today;
    if (period === "semaine") return d.semaine_num === weekNum && d.annee_num === year;
    if (period === "mois") return d.mois_num === month && d.annee_num === year;
    if (period === "annee") return d.annee_num === year;
    if (period === "historique") {
      if (histoPeriod === "semaine") return d.semaine_num === histoValue && d.annee_num === histoYear;
      if (histoPeriod === "mois") return d.mois_num === histoValue && d.annee_num === histoYear;
      if (histoPeriod === "annee") return d.annee_num === histoValue;
    }
    return true;
  });

  const totalXOF = filtered.reduce((s, d) => {
    return s + (d.devise === "USD" ? convertAmount(Number(d.montant), "USD", "XOF") : Number(d.montant));
  }, 0);

  const fmt = (v: number) => formatAmount(devise === "XOF" ? v : convertAmount(v, "XOF", "USD"), devise);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titre || !form.montant || !userId) return;
    const { error } = await supabase.from("depenses").insert([{
      titre: form.titre, montant: parseFloat(form.montant), devise: form.devise,
      categorie: form.categorie, note: form.note || null, date_depense: form.date_depense,
      user_id: userId,
    }]);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      playSuccessSound();
      toast({ title: "Enregistré", description: "Dépense enregistrée." });
      setForm({ titre: "", montant: "", devise: "XOF", categorie: "Alimentation", note: "", date_depense: today });
      setShowForm(false);
      loadDepenses();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette dépense ?") || !userId) return;
    await supabase.from("depenses").delete().eq("id", id).eq("user_id", userId);
    toast({ title: "Supprimé" });
    loadDepenses();
  };

  const exportExcel = () => {
    const data = filtered.map(d => ({
      "Titre": d.titre,
      "Montant original": `${Number(d.montant).toLocaleString()} ${d.devise}`,
      "Montant FCFA": d.devise === "USD" ? convertAmount(Number(d.montant), "USD", "XOF") : Number(d.montant),
      "Montant USD": (d.devise === "XOF" ? convertAmount(Number(d.montant), "XOF", "USD") : Number(d.montant)).toFixed(2),
      "Catégorie": d.categorie, "Date": d.date_depense, "Note": d.note || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dépenses");
    XLSX.writeFile(wb, `depenses_${today}.xlsx`);
  };

  const availableWeeks = [...new Set(depenses.map(d => `${d.semaine_num}-${d.annee_num}`))].sort();
  const availableYears = [...new Set(depenses.map(d => String(d.annee_num)))].sort();

  const periodLabels: Record<Period, string> = {
    jour: "Aujourd'hui", semaine: "Cette semaine", mois: "Ce mois", annee: "Cette année", historique: "Historique",
  };

  return (
    <AppLayout searchQuery={search} onSearchChange={setSearch}>
      <div className="space-y-5 animate-fade-in-up">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <h1 className="font-display font-bold text-xl flex items-center gap-2">
              <TrendingDown className="w-6 h-6 text-destructive" /> Dépenses
            </h1>
            <p className="text-sm text-muted-foreground">Gérez et suivez vos dépenses</p>
          </div>
          <select value={devise} onChange={(e) => setDevise(e.target.value as Devise)} className="border border-border rounded-lg px-3 py-2 text-sm bg-card font-semibold">
            <option value="XOF">XOF - FCFA</option>
            <option value="USD">USD - $</option>
          </select>
          <Button onClick={exportExcel} variant="outline" size="sm" className="gap-1.5 text-xs">
            <Download className="w-4 h-4" /> Excel
          </Button>
          <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-1.5 bg-primary text-primary-foreground">
            <Plus className="w-4 h-4" /> Ajouter
          </Button>
        </div>

        {showForm && (
          <div className="bg-card border border-primary/20 rounded-xl p-5 shadow-brand animate-fade-in-up">
            <h3 className="font-display font-bold mb-4 text-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nouvelle dépense
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="Titre *" value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} required />
              <div className="flex gap-2">
                <Input type="number" step="0.01" placeholder="Montant *" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} required className="flex-1" />
                <select value={form.devise} onChange={e => setForm(f => ({ ...f, devise: e.target.value as Devise }))} className="border border-border rounded-lg px-3 text-sm bg-card">
                  <option value="XOF">FCFA</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))} className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <Input type="date" value={form.date_depense} onChange={e => setForm(f => ({ ...f, date_depense: e.target.value }))} />
              <Input placeholder="Note (optionnel)" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="sm:col-span-2" />
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
                <Button type="submit" className="bg-primary text-primary-foreground">Enregistrer</Button>
              </div>
            </form>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {(Object.keys(periodLabels) as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${period === p ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-secondary-foreground hover:bg-primary/10"}`}>
              {periodLabels[p]}
            </button>
          ))}
        </div>

        {period === "historique" && (
          <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3 items-center">
            <select value={histoPeriod} onChange={e => setHistoPeriod(e.target.value as any)} className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
              <option value="semaine">Par semaine</option>
              <option value="mois">Par mois</option>
              <option value="annee">Par année</option>
            </select>
            {histoPeriod === "semaine" && (
              <>
                <select value={histoValue} onChange={e => setHistoValue(Number(e.target.value))} className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
                  {availableWeeks.map(w => {
                    const [wn, wy] = w.split("-").map(Number);
                    const mon = getMondayOfWeek(wn, wy);
                    return <option key={w} value={wn}>Sem. {wn} — {mon.toLocaleDateString("fr-FR")}</option>;
                  })}
                </select>
                <select value={histoYear} onChange={e => setHistoYear(Number(e.target.value))} className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </>
            )}
            {histoPeriod === "mois" && (
              <>
                <select value={histoValue} onChange={e => setHistoValue(Number(e.target.value))} className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <select value={histoYear} onChange={e => setHistoYear(Number(e.target.value))} className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </>
            )}
            {histoPeriod === "annee" && (
              <select value={histoValue} onChange={e => setHistoValue(Number(e.target.value))} className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <button onClick={() => setFilterCat("")} className={`px-3 py-1 rounded-full text-xs font-medium ${!filterCat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Tout</button>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setFilterCat(c === filterCat ? "" : c)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterCat === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/10"}`}>{c}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground font-medium">Total — {periodLabels[period]}</div>
              <div className="font-display font-black text-2xl text-destructive">{fmt(totalXOF)}</div>
              <div className="text-xs text-muted-foreground">{filtered.length} dépense(s)</div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <BarChart2 className="w-8 h-8 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">Équiv. USD</div>
              <div className="font-display font-bold text-xl">{formatAmount(convertAmount(totalXOF, "XOF", "USD"), "USD")}</div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Aucune dépense pour cette période</p>
              <Button onClick={() => setShowForm(true)} className="mt-3 bg-primary text-primary-foreground" size="sm">
                <Plus className="w-4 h-4 mr-1" /> Ajouter une dépense
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Titre</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Catégorie</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Montant</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">En {devise}</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Date</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(d => {
                    const montantXOF = d.devise === "USD" ? convertAmount(Number(d.montant), "USD", "XOF") : Number(d.montant);
                    return (
                      <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium">{d.titre}</div>
                          {d.note && <div className="text-xs text-muted-foreground">{d.note}</div>}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">{d.categorie}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{Number(d.montant).toLocaleString()} {d.devise}</td>
                        <td className="px-4 py-3 text-right font-bold text-destructive hidden md:table-cell">{fmt(montantXOF)}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground text-xs hidden sm:table-cell">{d.date_depense}</td>
                        <td className="px-3 py-3 text-center">
                          <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive hover:text-white text-destructive transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
