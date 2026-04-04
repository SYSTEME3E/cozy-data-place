import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { hasNexoraPremium, getNexoraUser } from "@/lib/nexora-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FileDown, Trash2, ChevronDown, ChevronUp, Receipt, History, Crown } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useNavigate } from "react-router-dom";

type Devise = "XOF" | "USD";
type Statut = "payee" | "en_attente" | "annulee";

interface Article {
  id?: string;
  nom: string;
  prix_unitaire: number;
  quantite: number;
  montant: number;
  ordre: number;
}

interface Facture {
  id: string;
  numero: string;
  date_facture: string;
  heure_facture: string;
  vendeur_nom: string;
  vendeur_ifu: string | null;
  vendeur_adresse: string;
  vendeur_pays: string;
  vendeur_contact: string;
  vendeur_email: string;
  client_nom: string;
  client_ifu: string | null;
  client_adresse: string | null;
  client_pays: string;
  client_contact: string;
  total: number;
  devise: Devise;
  mode_paiement: string;
  statut: Statut;
  note: string | null;
  articles?: Article[];
}

const STATUT_LABELS: Record<Statut, string> = { payee: "Payée", en_attente: "En attente", annulee: "Annulée" };
const STATUT_COLORS: Record<Statut, string> = {
  payee: "bg-green-100 text-green-800",
  en_attente: "bg-yellow-100 text-yellow-800",
  annulee: "bg-red-100 text-red-800",
};

const PAYS = ["Bénin","Togo","Côte d'Ivoire","Sénégal","Mali","Burkina Faso","Niger","Guinée","Cameroun","Ghana","Nigeria","France","États-Unis","Canada","Autre"];
const INDICATIFS: Record<string, string> = { "Bénin":"+229","Togo":"+228","Côte d'Ivoire":"+225","Sénégal":"+221","Mali":"+223","Burkina Faso":"+226","Niger":"+227","Guinée":"+224","Cameroun":"+237","Ghana":"+233","Nigeria":"+234","France":"+33","États-Unis":"+1","Canada":"+1","Autre":"" };

const LIMITE_GRATUIT = 10;

function fmt(amount: number, devise: Devise): string {
  if (devise === "USD") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount);
  return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
}

function genNumero(): string {
  const now = new Date();
  return `FAC-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}-${Math.floor(Math.random()*900000)+100000}`;
}

function getHeureNow(): string {
  return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

async function generateFacturePDF(facture: Facture, articles: Article[]) {
  const jspdf = await import("jspdf");
  const { jsPDF } = jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, margin = 15;
  const bleu: [number,number,number] = [26,86,219];
  const bleuClair: [number,number,number] = [219,234,254];
  const gris: [number,number,number] = [100,116,139];
  const noir: [number,number,number] = [15,23,42];
  const grisLight: [number,number,number] = [241,245,249];

  // ── HEADER: NEXORA FACTURE ──
doc.setFillColor(...bleu);
doc.rect(0, 0, W, 48, "F");

// ===== TITRE JAUNE =====
doc.setTextColor(255, 204, 0); // JAUNE NEXORA
doc.setFont("helvetica", "bold");
doc.setFontSize(18);

doc.text("NEXORA FACTURE", margin + 36, 16);

// ===== INFOS VENDEUR =====
doc.setTextColor(255,255,255);
doc.setFontSize(9);
doc.setFont("helvetica","normal");

doc.text(
  facture.vendeur_nom.toUpperCase(),
  margin + 36,
  23
);

if (facture.vendeur_ifu) {
  doc.text(`IFU : ${facture.vendeur_ifu}`, margin + 36, 29);
}

// ===== INFOS FACTURE DROITE =====
doc.setFont("helvetica","bold");
doc.setFontSize(10);

doc.text(
  `Facture # ${facture.numero}`,
  W - margin,
  14,
  { align: "right" }
);

doc.setFont("helvetica","normal");
doc.setFontSize(9);

doc.text(
  `Date : ${new Date(facture.date_facture)
    .toLocaleDateString("fr-FR")}`,
  W - margin,
  22,
  { align: "right" }
);

doc.text(
  `Heure : ${facture.heure_facture}`,
  W - margin,
  28,
  { align: "right" }
);
  
  let y = 55;
  const colW = (W-margin*2-8)/2;
  doc.setFillColor(...grisLight); doc.roundedRect(margin, y, colW, 44, 2, 2, "F");
  doc.setTextColor(...bleu); doc.setFont("helvetica","bold"); doc.setFontSize(9);
  doc.text("VENDEUR", margin+4, y+7);
  doc.setTextColor(...noir); doc.setFont("helvetica","normal"); doc.setFontSize(8.5);
  [facture.vendeur_adresse, `Pays : ${facture.vendeur_pays}`, `Tél : ${INDICATIFS[facture.vendeur_pays]||""} ${facture.vendeur_contact}`, `Email : ${facture.vendeur_email}`]
    .filter(Boolean).forEach((l,i) => doc.text(l, margin+4, y+14+i*6));
  const cx = margin+colW+8;
  doc.setFillColor(...bleuClair); doc.roundedRect(cx, y, colW, 44, 2, 2, "F");
  doc.setTextColor(...bleu); doc.setFont("helvetica","bold"); doc.setFontSize(9);
  doc.text("CLIENT", cx+4, y+7);
  doc.setTextColor(...noir); doc.setFont("helvetica","normal"); doc.setFontSize(8.5);
  [`Nom : ${facture.client_nom}`, facture.client_ifu ? `IFU : ${facture.client_ifu}` : "", `Pays : ${facture.client_pays}`, facture.client_adresse ? `Adresse : ${facture.client_adresse}` : "", `Tél : ${INDICATIFS[facture.client_pays]||""} ${facture.client_contact}`]
    .filter(Boolean).forEach((l,i) => doc.text(l, cx+4, y+14+i*6));
  y += 52;

  // ── TABLE DES ARTICLES ──
  const cw = [8,74,28,18,32]; const cxs: number[] = []; let ox = margin;
  cw.forEach(w => { cxs.push(ox); ox += w; });
  doc.setFillColor(...bleu); doc.rect(margin, y, W-margin*2, 8, "F");
  doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(8.5);
  ["#","Nom du service / produit","Prix unitaire","Qté","Montant TTC"].forEach((h,i) => {
    doc.text(h, i>=2 ? cxs[i]+cw[i]-2 : cxs[i]+2, y+5.5, { align: i>=2 ? "right" : "left" });
  });
  y += 8;
  articles.forEach((art,idx) => {
    const bg: [number,number,number] = idx%2===0 ? [255,255,255] : grisLight;
    doc.setFillColor(...bg); doc.rect(margin, y, W-margin*2, 8, "F");
    doc.setTextColor(...noir); doc.setFont("helvetica","normal"); doc.setFontSize(8.5);
    doc.text(String(idx+1), cxs[0]+2, y+5.5);
    doc.text(art.nom, cxs[1]+2, y+5.5);
    doc.text(fmt(art.prix_unitaire, facture.devise), cxs[2]+cw[2]-2, y+5.5, { align:"right" });
    doc.text(String(art.quantite), cxs[3]+cw[3]-2, y+5.5, { align:"right" });
    doc.text(fmt(art.montant, facture.devise), cxs[4]+cw[4]-2, y+5.5, { align:"right" });
    y += 8;
  });
  doc.setDrawColor(...bleu); doc.line(margin, y, W-margin, y); y += 6;
  doc.setFillColor(...bleu); doc.roundedRect(W-margin-65, y, 65, 12, 2, 2, "F");
  doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(11);
  doc.text(`Total : ${fmt(facture.total, facture.devise)}`, W-margin-3, y+8, { align:"right" });
  y += 20;
  doc.setFillColor(...grisLight); doc.roundedRect(margin, y, W-margin*2, 14, 2, 2, "F");
  doc.setTextColor(...bleu); doc.setFont("helvetica","bold"); doc.setFontSize(9);
  doc.text("MODE DE PAIEMENT", margin+4, y+6);
  doc.setTextColor(...noir); doc.setFont("helvetica","normal");
  doc.text(facture.mode_paiement, margin+4, y+12);
  doc.setFont("helvetica","bold");
  doc.text(fmt(facture.total, facture.devise), W-margin-3, y+12, { align:"right" });
  y += 20;
  doc.setTextColor(...gris); doc.setFont("helvetica","italic"); doc.setFontSize(8);
  doc.text(`Arrêté la présente facture à la somme de ${fmt(facture.total, facture.devise)} TTC`, margin, y);
  if (facture.note) { y+=8; doc.setTextColor(...noir); doc.setFont("helvetica","normal"); doc.text(`Note : ${facture.note}`, margin, y); }

  // ── FOOTER: NEXORA branding + watermark ──
  doc.setFillColor(...bleu); doc.rect(0,282,W,15,"F");
  doc.setTextColor(255,255,255); doc.setFontSize(8); doc.setFont("helvetica","bold");
  doc.text("NEXORA", W/2, 288, { align:"center" });
  doc.setFont("helvetica","normal"); doc.setFontSize(7);
  doc.text(
  `Document généré le ${new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  })} — Facture non normalisée`,
  W / 2,
  293,
  { align: "center" }
);


  doc.save(`facture_${facture.numero}_${facture.client_nom.replace(/\s/g,"_")}.pdf`);
}

export default function FacturesPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const isPremium = hasNexoraPremium();

  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showHistorique, setShowHistorique] = useState(false);
  const [heure, setHeure] = useState(getHeureNow());

  useEffect(() => { const t = setInterval(() => setHeure(getHeureNow()), 1000); return () => clearInterval(t); }, []);

  const emptyArt = (): Article => ({ nom: "", prix_unitaire: 0, quantite: 1, montant: 0, ordre: 0 });

  const [form, setForm] = useState({
    vendeur_nom: "", vendeur_ifu: "", vendeur_adresse: "", vendeur_pays: "", vendeur_contact: "", vendeur_email: "",
    client_nom: "", client_ifu: "", client_adresse: "", client_pays: "", client_contact: "",
    mode_paiement: "ESPECES", devise: "XOF" as Devise, statut: "payee" as Statut, note: "",
  });

  const [articles, setArticles] = useState<Article[]>([emptyArt()]);

  const total = articles.reduce((sum, a) => sum + (parseFloat(String(a.prix_unitaire))||0) * (parseFloat(String(a.quantite))||0), 0);

  const load = async () => {
    setLoading(true);
    const userId = getNexoraUser()?.id;
    if (!userId) { setLoading(false); return; }
    const { data } = await supabase.from("factures" as any).select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (data) setFactures((data as any[]).map(f => ({ ...f, articles: [] })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const nbFactures = factures.length;
  const limiteAtteinte = !isPremium && nbFactures >= LIMITE_GRATUIT;

  const updateArticle = (idx: number, field: string, value: string) => {
    setArticles(prev => prev.map((a, i) => {
      if (i !== idx) return a;
      const updated = { ...a };
      if (field === "nom") updated.nom = value;
      else if (field === "prix_unitaire") updated.prix_unitaire = parseFloat(value) || 0;
      else if (field === "quantite") updated.quantite = parseFloat(value) || 0;
      updated.montant = (parseFloat(String(updated.prix_unitaire))||0) * (parseFloat(String(updated.quantite))||0);
      return updated;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPremium && nbFactures >= LIMITE_GRATUIT) {
      toast({ title: "Limite atteinte", description: `Plan gratuit limité à ${LIMITE_GRATUIT} factures. Passez au Premium.`, variant: "destructive" });
      return;
    }
    if (!form.vendeur_nom || !form.vendeur_adresse || !form.vendeur_contact || !form.vendeur_pays || !form.vendeur_email) {
      toast({ title: "Tous les champs vendeur sont obligatoires", variant: "destructive" }); return;
    }
    if (!form.client_nom || !form.client_contact || !form.client_pays) {
      toast({ title: "Nom, pays et contact client sont obligatoires", variant: "destructive" }); return;
    }
    if (articles.some(a => !a.nom || (parseFloat(String(a.prix_unitaire))||0) <= 0)) {
      toast({ title: "Vérifiez les articles", variant: "destructive" }); return;
    }
    setSaving(true);
    const numero = genNumero();
    const userId = getNexoraUser()?.id;
    if (!userId) { toast({ title: "Erreur", description: "Utilisateur non connecté", variant: "destructive" }); setSaving(false); return; }
    const { data: newF, error } = await supabase.from("factures" as any).insert({
      user_id: userId,
      numero, date_facture: new Date().toISOString().split("T")[0], heure_facture: getHeureNow(),
      vendeur_nom: form.vendeur_nom, vendeur_ifu: form.vendeur_ifu || null,
      vendeur_adresse: form.vendeur_adresse, vendeur_pays: form.vendeur_pays,
      vendeur_contact: form.vendeur_contact, vendeur_email: form.vendeur_email,
      client_nom: form.client_nom, client_ifu: form.client_ifu || null,
      client_adresse: form.client_adresse || null, client_pays: form.client_pays,
      client_contact: form.client_contact, total,
      devise: form.devise, mode_paiement: form.mode_paiement, statut: form.statut, note: form.note || null,
    }).select().single();
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); setSaving(false); return; }
    await supabase.from("articles_facture" as any).insert(
      articles.map((a, i) => ({
        facture_id: (newF as any).id, nom: a.nom,
        prix_unitaire: parseFloat(String(a.prix_unitaire))||0,
        quantite: parseFloat(String(a.quantite))||0,
        montant: (parseFloat(String(a.prix_unitaire))||0) * (parseFloat(String(a.quantite))||0),
        ordre: i,
      }))
    );
    toast({ title: "Facture créée", description: `Facture ${numero} enregistrée.` });
    setShowForm(false);
    setForm({ vendeur_nom:"",vendeur_ifu:"",vendeur_adresse:"",vendeur_pays:"",vendeur_contact:"",vendeur_email:"",client_nom:"",client_ifu:"",client_adresse:"",client_pays:"",client_contact:"",mode_paiement:"ESPECES",devise:"XOF",statut:"payee",note:"" });
    setArticles([emptyArt()]);
    setSaving(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette facture ?")) return;
    await supabase.from("factures" as any).delete().eq("id", id);
    toast({ title: "Supprimée" }); load();
  };

  const facturesParDate = factures.reduce((acc, f) => {
    const d = new Date(f.date_facture).toLocaleDateString("fr-FR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });
    if (!acc[d]) acc[d] = [];
    acc[d].push(f);
    return acc;
  }, {} as Record<string, Facture[]>);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-5 pb-10">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">Factures</h1>
            <p className="text-sm text-muted-foreground">
              {isPremium ? "Illimité" : `${nbFactures} / ${LIMITE_GRATUIT} factures utilisées`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setShowHistorique(!showHistorique); setShowForm(false); }} className="gap-1">
              <History className="w-4 h-4" /> {showHistorique ? "Liste" : "Historique"}
            </Button>
            <Button
              onClick={() => {
                if (limiteAtteinte) {
                  toast({ title: "Limite atteinte", description: `Plan gratuit limité à ${LIMITE_GRATUIT} factures.`, variant: "destructive" });
                  return;
                }
                setShowForm(!showForm); setShowHistorique(false);
              }}
              className="bg-primary text-white gap-1"
            >
              <Plus className="w-4 h-4" /> Nouvelle
            </Button>
          </div>
        </div>

        {/* Bannière quota */}
        {!isPremium && (
          <div className={`rounded-xl px-4 py-3 flex items-center justify-between gap-3 border ${limiteAtteinte ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"}`}>
            <div className="flex items-center gap-2 min-w-0">
              <Crown className={`w-4 h-4 flex-shrink-0 ${limiteAtteinte ? "text-red-500" : "text-yellow-600"}`} />
              <p className={`text-xs font-semibold ${limiteAtteinte ? "text-red-700" : "text-yellow-700"}`}>
                Factures : {nbFactures} / {LIMITE_GRATUIT}{limiteAtteinte && " — Limite atteinte"}
              </p>
            </div>
            <button onClick={() => navigate("/abonnement")} className="flex-shrink-0 text-xs font-bold bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1.5 rounded-lg">
              Passer Premium
            </button>
          </div>
        )}

        {/* Mur limite */}
        {limiteAtteinte && !showForm && !showHistorique && (
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center mx-auto shadow-md">
              <Crown className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="font-black text-gray-800 text-lg">Limite du plan gratuit atteinte</p>
              <p className="text-gray-500 text-sm mt-1">Vous avez atteint les <span className="font-bold">{LIMITE_GRATUIT} factures</span> incluses dans le plan gratuit.</p>
              <p className="text-gray-400 text-xs mt-1">Passez au Premium pour créer des factures sans limite.</p>
            </div>
            <button onClick={() => navigate("/abonnement")} className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition-all">
              <Crown className="w-4 h-4" /> Passer à Premium
            </button>
          </div>
        )}

        {/* Formulaire */}
        {showForm && !limiteAtteinte && (
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Nouvelle facture</h2>
              <div className="text-right bg-muted rounded-xl px-3 py-2">
                <div className="font-mono font-bold text-primary text-sm">{heure}</div>
                <div className="text-xs text-muted-foreground">{new Date().toLocaleDateString("fr-FR")}</div>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Vendeur */}
              <div className="space-y-3 border border-primary/20 rounded-xl p-4 bg-primary/5">
                <p className="font-semibold text-primary text-sm">Informations Vendeur (tous obligatoires)</p>
                <div><label className="text-sm font-medium">Nom du vendeur *</label><Input value={form.vendeur_nom} onChange={e => setForm({...form, vendeur_nom: e.target.value})} placeholder="Nom ou société" className="mt-1" /></div>
                <div><label className="text-sm font-medium">IFU (optionnel)</label><Input value={form.vendeur_ifu} onChange={e => setForm({...form, vendeur_ifu: e.target.value})} placeholder="Numéro IFU" className="mt-1" /></div>
                <div><label className="text-sm font-medium">Adresse *</label><Input value={form.vendeur_adresse} onChange={e => setForm({...form, vendeur_adresse: e.target.value})} placeholder="Adresse complète" className="mt-1" /></div>
                <div><label className="text-sm font-medium">Pays *</label>
                  <select value={form.vendeur_pays} onChange={e => setForm({...form, vendeur_pays: e.target.value})} className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                    <option value="">-- Choisir le pays --</option>{PAYS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-medium">Contact *</label>
                  <div className="flex gap-2 mt-1">
                    <div className="h-10 px-3 flex items-center rounded-md border border-input bg-muted text-sm font-mono min-w-16 text-center">{form.vendeur_pays ? INDICATIFS[form.vendeur_pays] : "🌍"}</div>
                    <Input value={form.vendeur_contact} onChange={e => setForm({...form, vendeur_contact: e.target.value})} placeholder="Numéro de téléphone" />
                  </div>
                </div>
                <div><label className="text-sm font-medium">Email *</label><Input type="email" value={form.vendeur_email} onChange={e => setForm({...form, vendeur_email: e.target.value})} placeholder="email@exemple.com" className="mt-1" /></div>
              </div>
              {/* Client */}
              <div className="space-y-3 border border-orange-200 rounded-xl p-4 bg-orange-50/50">
                <p className="font-semibold text-orange-600 text-sm">Informations Client</p>
                <div><label className="text-sm font-medium">Nom du client *</label><Input value={form.client_nom} onChange={e => setForm({...form, client_nom: e.target.value})} placeholder="Nom du client" className="mt-1" /></div>
                <div><label className="text-sm font-medium">IFU (optionnel)</label><Input value={form.client_ifu} onChange={e => setForm({...form, client_ifu: e.target.value})} placeholder="Numéro IFU" className="mt-1" /></div>
                <div><label className="text-sm font-medium">Pays *</label>
                  <select value={form.client_pays} onChange={e => setForm({...form, client_pays: e.target.value})} className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                    <option value="">-- Choisir le pays --</option>{PAYS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-medium">Contact *</label>
                  <div className="flex gap-2 mt-1">
                    <div className="h-10 px-3 flex items-center rounded-md border border-input bg-muted text-sm font-mono min-w-16 text-center">{form.client_pays ? INDICATIFS[form.client_pays] : "🌍"}</div>
                    <Input value={form.client_contact} onChange={e => setForm({...form, client_contact: e.target.value})} placeholder="Numéro de téléphone" />
                  </div>
                </div>
                <div><label className="text-sm font-medium">Adresse (optionnel)</label><Input value={form.client_adresse} onChange={e => setForm({...form, client_adresse: e.target.value})} placeholder="Adresse client" className="mt-1" /></div>
              </div>
              {/* Articles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">Articles / Services</p>
                  <Button type="button" size="sm" variant="outline" onClick={() => setArticles(p => [...p, emptyArt()])} className="gap-1 h-8"><Plus className="w-3 h-3" /> Ajouter</Button>
                </div>
                {articles.map((art, idx) => (
                  <div key={idx} className="bg-muted/40 border border-border rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Article {idx+1}</span>
                      {articles.length > 1 && (
                        <button type="button" onClick={() => setArticles(p => p.filter((_,i) => i !== idx))} className="w-6 h-6 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors flex items-center justify-center"><Trash2 className="w-3 h-3" /></button>
                      )}
                    </div>
                    <Input value={art.nom} onChange={e => updateArticle(idx,"nom",e.target.value)} placeholder="Description du service ou produit..." className="bg-white" />
                    <div className="grid grid-cols-3 gap-2">
                      <div><label className="text-xs text-muted-foreground">Prix unitaire</label><Input type="number" min="0" value={art.prix_unitaire===0?"":String(art.prix_unitaire)} onChange={e => updateArticle(idx,"prix_unitaire",e.target.value)} placeholder="0" className="mt-1 bg-white" /></div>
                      <div><label className="text-xs text-muted-foreground">Quantité</label><Input type="number" min="1" value={art.quantite===0?"":String(art.quantite)} onChange={e => updateArticle(idx,"quantite",e.target.value)} placeholder="1" className="mt-1 bg-white" /></div>
                      <div><label className="text-xs text-muted-foreground">Montant</label><div className="mt-1 h-10 px-3 flex items-center rounded-md bg-primary/10 border border-primary/20 font-bold text-primary text-sm">{Math.round((parseFloat(String(art.prix_unitaire))||0)*(parseFloat(String(art.quantite))||0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g," ")}</div></div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end">
                  <div className="bg-primary text-white rounded-xl px-5 py-3 font-bold text-lg shadow-md">
                    Total : {Math.round(total).toString().replace(/\B(?=(\d{3})+(?!\d))/g," ")} {form.devise==="XOF"?"FCFA":"USD"}
                  </div>
                </div>
              </div>
              {/* Paiement */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium">Mode de paiement *</label>
                    <select value={form.mode_paiement} onChange={e => setForm({...form, mode_paiement: e.target.value})} className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                      <option>ESPECES</option><option>MOBILE MONEY</option><option>VIREMENT</option><option>CHEQUE</option><option>CARTE</option>
                    </select>
                  </div>
                  <div><label className="text-sm font-medium">Devise</label>
                    <select value={form.devise} onChange={e => setForm({...form, devise: e.target.value as Devise})} className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                      <option value="XOF">FCFA (XOF)</option><option value="USD">Dollar (USD)</option>
                    </select>
                  </div>
                </div>
                <div><label className="text-sm font-medium">Statut</label>
                  <select value={form.statut} onChange={e => setForm({...form, statut: e.target.value as Statut})} className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                    <option value="payee">Payée</option><option value="en_attente">En attente</option><option value="annulee">Annulée</option>
                  </select>
                </div>
                <div><label className="text-sm font-medium">Note (optionnel)</label><Input value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder="Note ou remarque..." className="mt-1" /></div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">Annuler</Button>
                <Button type="submit" disabled={saving} className="flex-1 bg-primary text-white">{saving ? "Enregistrement..." : "Enregistrer"}</Button>
              </div>
            </form>
          </div>
        )}

        {/* Historique */}
        {showHistorique && !showForm && (
          <div className="space-y-4">
            <h2 className="font-bold text-lg flex items-center gap-2"><History className="w-5 h-5 text-primary" /> Historique des factures</h2>
            {loading ? <div className="text-center py-8 text-muted-foreground">Chargement...</div>
            : Object.keys(facturesParDate).length === 0 ? <div className="text-center py-10 text-muted-foreground">Aucune facture</div>
            : Object.entries(facturesParDate).map(([date, fList]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-semibold text-muted-foreground capitalize px-2">{date}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-2">
                  {fList.map(f => (
                    <div key={f.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-primary text-xs">{f.numero}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUT_COLORS[f.statut]}`}>{STATUT_LABELS[f.statut]}</span>
                        </div>
                        <div className="font-semibold text-sm truncate">{f.client_nom}</div>
                        <div className="text-xs text-muted-foreground">{f.heure_facture}</div>
                        <div className="font-bold text-primary">{fmt(f.total, f.devise)}</div>
                      </div>
                      <button onClick={async () => {
                        const { data: arts } = await supabase.from("articles_facture" as any).select("*").eq("facture_id", f.id).order("ordre");
                        generateFacturePDF(f, (arts || []) as unknown as Article[]);
                      }} className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors flex-shrink-0"><FileDown className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Liste normale */}
        {!showHistorique && !showForm && (
          <>
            {loading ? <div className="text-center py-10 text-muted-foreground">Chargement...</div>
            : factures.length === 0 ? (
              <div className="text-center py-14 bg-card border border-border rounded-2xl">
                <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Aucune facture créée</p>
              </div>
            ) : (
              <div className="space-y-3">
                {factures.map(facture => {
                  const isExpanded = expandedId === facture.id;
                  return (
                    <div key={facture.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-primary text-sm">{facture.numero}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUT_COLORS[facture.statut]}`}>{STATUT_LABELS[facture.statut]}</span>
                            </div>
                            <div className="font-semibold mt-0.5 truncate">{facture.client_nom}</div>
                            <div className="text-xs text-muted-foreground">{new Date(facture.date_facture).toLocaleDateString("fr-FR")}{facture.heure_facture && ` à ${facture.heure_facture}`}</div>
                            <div className="text-lg font-black text-primary mt-1">{fmt(facture.total, facture.devise)}</div>
                          </div>
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            <button onClick={async () => {
                              const { data: arts } = await supabase.from("articles_facture" as any).select("*").eq("facture_id", facture.id).order("ordre");
                              generateFacturePDF(facture, (arts || []) as unknown as Article[]);
                            }} className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors" title="PDF"><FileDown className="w-4 h-4" /></button>
                            <button onClick={async () => {
                              if (!isExpanded) {
                                const { data: arts } = await supabase.from("articles_facture" as any).select("*").eq("facture_id", facture.id).order("ordre");
                                setFactures(prev => prev.map(f => f.id === facture.id ? { ...f, articles: (arts || []) as unknown as Article[] } : f));
                              }
                              setExpandedId(isExpanded ? null : facture.id);
                            }} className="p-2 rounded-lg hover:bg-muted transition-colors">{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
                            <button onClick={() => handleDelete(facture.id)} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t border-border bg-muted/30 p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><span className="text-muted-foreground">Vendeur :</span> <span className="font-medium">{facture.vendeur_nom}</span></div>
                            <div><span className="text-muted-foreground">Mode :</span> <span className="font-medium">{facture.mode_paiement}</span></div>
                            <div><span className="text-muted-foreground">Contact :</span> <span className="font-medium">{INDICATIFS[facture.client_pays]||""} {facture.client_contact}</span></div>
                            {facture.client_adresse && <div><span className="text-muted-foreground">Adresse :</span> <span className="font-medium">{facture.client_adresse}</span></div>}
                          </div>
                          {facture.articles && facture.articles.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-2">Articles</p>
                              <div className="space-y-1">
                                {facture.articles.map((art,i) => (
                                  <div key={i} className="flex justify-between items-center text-sm bg-white border border-border rounded-lg px-3 py-2">
                                    <span className="flex-1 truncate">{art.nom}</span>
                                    <span className="text-muted-foreground text-xs mx-2">{art.quantite} × {fmt(art.prix_unitaire, facture.devise)}</span>
                                    <span className="font-semibold text-primary">{fmt(art.montant, facture.devise)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {facture.note && <p className="text-xs text-muted-foreground italic">Note: {facture.note}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
