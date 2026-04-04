import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatAmount } from "@/lib/app-utils";
import { hasNexoraPremium, getNexoraUser } from "@/lib/nexora-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FileDown, ChevronDown, ChevronUp, Trash2, HandCoins, Calendar, ArrowRight, Crown } from "lucide-react";
import SignaturePad from "@/components/SignaturePad";
import AppLayout from "@/components/AppLayout";
import { useNavigate } from "react-router-dom";

type Devise = "XOF" | "USD";
type Statut = "en_attente" | "partiel" | "rembourse";

interface Pret {
  id: string;
  nom_personne: string;
  nom_preteur: string | null;
  montant: number;
  montant_rembourse: number;
  devise: Devise;
  objectif: string;
  date_pret: string;
  date_echeance: string | null;
  statut: Statut;
  signature_emprunteur: string | null;
  signature_temoin: string | null;
  signature_preteur: string | null;
  nom_temoin: string | null;
  note: string | null;
}

interface Remboursement {
  id: string;
  pret_id: string;
  montant: number;
  devise: Devise;
  date_remboursement: string;
  note: string | null;
}

const STATUT_LABELS: Record<Statut, string> = {
  en_attente: "En attente",
  partiel: "Partiel",
  rembourse: "Remboursé",
};

const STATUT_COLORS: Record<Statut, string> = {
  en_attente: "bg-yellow-100 text-yellow-800",
  partiel: "bg-blue-100 text-blue-800",
  rembourse: "bg-green-100 text-green-800",
};

const LIMITE_GRATUIT = 10;

async function generatePDF(pret: Pret) {
  const jspdf = await import("jspdf");
  const { jsPDF } = jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const margin = 20;

  const bleu: [number, number, number] = [26, 86, 219];
  const bleuClair: [number, number, number] = [219, 234, 254];
  const gris: [number, number, number] = [100, 116, 139];
  const noir: [number, number, number] = [15, 23, 42];
  const vert: [number, number, number] = [22, 163, 74];

  const preteur = pret.nom_preteur || "—";
  const emprunteur = pret.nom_personne;

  doc.setFillColor(...bleu);
  doc.rect(0, 0, W, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("CONTRAT DE PRET", W / 2, 18, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Preteur : ${preteur}  |  Emprunteur : ${emprunteur}`, W / 2, 28, { align: "center" });
  doc.text(`Ref: ${pret.id.substring(0, 8).toUpperCase()}`, W / 2, 35, { align: "center" });

  let y = 52;

  doc.setFillColor(...bleuClair);
  doc.roundedRect(margin, y, W - margin * 2, 56, 3, 3, "F");
  doc.setTextColor(...bleu);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("INFORMATIONS DU CONTRAT", margin + 5, y + 8);

  doc.setTextColor(...noir);
  doc.setFontSize(10);

  const dateStr = new Date(pret.date_pret).toLocaleDateString("fr-FR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  const infos = [
    ["Preteur Nom complet :", preteur],
    ["Emprunteur :", emprunteur],
    ["Montant du pret :", formatAmount(pret.montant, pret.devise)],
    ["Date du pret :", dateStr],
    ["Objectif :", pret.objectif],
  ];

  infos.forEach(([label, value], i) => {
    const row = y + 16 + i * 8;
    doc.setFont("helvetica", "bold");
    doc.text(label, margin + 5, row);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 55, row);
  });

  y += 66;

  if (pret.date_echeance) {
    doc.setFillColor(254, 249, 195);
    doc.roundedRect(margin, y, W - margin * 2, 12, 2, 2, "F");
    doc.setTextColor(133, 77, 14);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    const ech = new Date(pret.date_echeance).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "long", year: "numeric",
    });
    doc.text(`Date de remboursement prevue : ${ech}`, margin + 5, y + 8);
    y += 20;
  }

  doc.setTextColor(...noir);
  doc.setFontSize(10);

  const texteLines = [
    `Entre les soussignes :`,
    ``,
    `- Le PRETEUR : ${preteur}`,
    `- L'EMPRUNTEUR : ${emprunteur}`,
    pret.nom_temoin ? `- TEMOIN : ${pret.nom_temoin}` : "",
    ``,
    `Il a ete convenu ce qui suit :`,
    ``,
    `Article 1 - OBJET DU PRET`,
    `Le preteur ${preteur} consent a preter a l'emprunteur ${emprunteur}`,
    `la somme de ${formatAmount(pret.montant, pret.devise)}.`,
    `Objectif : ${pret.objectif}`,
    ``,
    `Article 2 - REMBOURSEMENT`,
    pret.date_echeance
      ? `L'emprunteur s'engage a rembourser la totalite au plus tard le ${new Date(pret.date_echeance).toLocaleDateString("fr-FR")}.`
      : `L'emprunteur s'engage a rembourser selon les modalites convenues entre les parties.`,
    ``,
    `Article 3 - BONNE FOI`,
    `Les deux parties s'engagent a respecter les termes du present contrat`,
    `de bonne foi et a se notifier mutuellement de tout empechement.`,
  ].filter(l => l !== undefined) as string[];

  texteLines.forEach((ligne) => {
    if (y > 240) { doc.addPage(); y = 20; }
    if (ligne.startsWith("Article")) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...bleu);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...noir);
    }
    if (ligne) doc.text(ligne, margin, y);
    y += ligne === "" ? 4 : 6;
  });

  y += 8;

  const statutColor: [number, number, number] =
    pret.statut === "rembourse" ? vert :
    pret.statut === "partiel" ? [59, 130, 246] :
    [234, 179, 8];
  doc.setFillColor(...statutColor);
  doc.roundedRect(margin, y, W - margin * 2, 12, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(
    `Statut : ${STATUT_LABELS[pret.statut]} - Rembourse : ${formatAmount(pret.montant_rembourse, pret.devise)} / ${formatAmount(pret.montant, pret.devise)}`,
    margin + 5, y + 8
  );
  y += 22;

  if (y > 220) { doc.addPage(); y = 20; }

  doc.setFillColor(...bleuClair);
  doc.roundedRect(margin, y, W - margin * 2, 8, 2, 2, "F");
  doc.setTextColor(...bleu);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("SIGNATURES", W / 2, y + 5.5, { align: "center" });
  y += 14;

  const sigW = (W - margin * 2 - 10) / 3;

  const drawSigBox = async (title: string, sigData: string | null, nom: string, xPos: number) => {
    doc.setTextColor(...noir);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(title, xPos + sigW / 2, y, { align: "center" });
    doc.setDrawColor(...bleu);
    doc.roundedRect(xPos, y + 3, sigW, 28, 2, 2);
    if (sigData && sigData.startsWith("data:image")) {
      try { doc.addImage(sigData, "PNG", xPos + 2, y + 5, sigW - 4, 22); } catch {}
    } else {
      doc.setTextColor(...gris);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("Non signe", xPos + sigW / 2, y + 18, { align: "center" });
    }
    doc.setTextColor(...noir);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(nom, xPos + sigW / 2, y + 35, { align: "center" });
  };

  await drawSigBox("PRETEUR", pret.signature_preteur, preteur, margin);
  await drawSigBox("EMPRUNTEUR", pret.signature_emprunteur, emprunteur, margin + sigW + 5);
  await drawSigBox("TEMOIN", pret.signature_temoin, pret.nom_temoin || "—", margin + (sigW + 5) * 2);

  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  doc.setFillColor(...bleu);
  doc.rect(0, 282, W, 15, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("NEXORA", W / 2, 288, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Document généré le ${today} — nexora-app`, W / 2, 293, { align: "center" });

  doc.save(`contrat_pret_${pret.nom_personne.replace(/\s/g, "_")}_${new Date(pret.date_pret).toLocaleDateString("fr-FR").replace(/\//g, "-")}.pdf`);
}

export default function PretsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const isPremium = hasNexoraPremium();

  const [prets, setPrets] = useState<Pret[]>([]);
  const [remboursements, setRemboursements] = useState<Remboursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRembForm, setShowRembForm] = useState<string | null>(null);

  const emptyForm = {
    nom_preteur: "",
    nom_personne: "",
    montant: "",
    devise: "XOF" as Devise,
    objectif: "",
    date_pret: new Date().toISOString().split("T")[0],
    date_echeance: "",
    nom_temoin: "",
    note: "",
    signature_preteur: "",
    signature_emprunteur: "",
    signature_temoin: "",
  };

  const [form, setForm] = useState(emptyForm);
  const [rembForm, setRembForm] = useState({ montant: "", note: "" });

  const load = async () => {
    setLoading(true);
    const userId = getNexoraUser()?.id;
    if (!userId) { setLoading(false); return; }
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("prets" as any).select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("remboursements" as any).select("*").eq("user_id", userId).order("date_remboursement", { ascending: false }),
    ]);
    setPrets((p as unknown as Pret[]) || []);
    setRemboursements((r as unknown as Remboursement[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const nbPrets = prets.length;
  const limiteAtteinte = !isPremium && nbPrets >= LIMITE_GRATUIT;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPremium && nbPrets >= LIMITE_GRATUIT) {
      toast({
        title: "Limite atteinte",
        description: `Le plan gratuit est limité à ${LIMITE_GRATUIT} contrats. Passez au Premium pour continuer.`,
        variant: "destructive",
      });
      return;
    }

    if (
      !form.nom_preteur.trim() ||
      !form.nom_personne.trim() ||
      !form.montant ||
      !form.objectif.trim() ||
      !form.date_pret ||
      !form.date_echeance
    ) {
      toast({
        title: "Champs requis",
        description: "Tous les champs sont obligatoires sauf la note et le témoin.",
        variant: "destructive",
      });
      return;
    }

    const userId = getNexoraUser()?.id;
    if (!userId) return;

    const { error } = await supabase.from("prets" as any).insert({
      type: "pret",
      nom_personne: form.nom_personne,
      nom_preteur: form.nom_preteur,
      user_id: userId,
      montant: parseFloat(form.montant),
      devise: form.devise,
      objectif: form.objectif,
      date_pret: form.date_pret,
      date_echeance: form.date_echeance,
      nom_temoin: form.nom_temoin || null,
      note: form.note || null,
      signature_preteur: form.signature_preteur || null,
      signature_emprunteur: form.signature_emprunteur || null,
      signature_temoin: form.signature_temoin || null,
    });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Enregistré", description: "Contrat de prêt ajouté avec succès." });
    setShowForm(false);
    setForm(emptyForm);
    load();
  };

  const handleRemboursement = async (pret: Pret) => {
    if (!rembForm.montant) return;
    const montant = parseFloat(rembForm.montant);
    const nouveauTotal = pret.montant_rembourse + montant;
    const nouveauStatut: Statut = nouveauTotal >= pret.montant ? "rembourse" : "partiel";
    const userId = getNexoraUser()?.id;
    if (!userId) return;
    const { error } = await supabase.from("remboursements" as any).insert({
      pret_id: pret.id, montant, devise: pret.devise, note: rembForm.note || null, user_id: userId,
    });
    if (!error) {
      await supabase.from("prets" as any).update({ montant_rembourse: nouveauTotal, statut: nouveauStatut }).eq("id", pret.id);
      toast({ title: "Remboursement enregistré" });
      setShowRembForm(null);
      setRembForm({ montant: "", note: "" });
      load();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce contrat de prêt ?")) return;
    await supabase.from("prets" as any).delete().eq("id", id);
    toast({ title: "Supprimé" });
    load();
  };

  const rembPour = (id: string) => remboursements.filter(r => r.pret_id === id);

  const emprunteurLabel = form.nom_personne || "Emprunteur";

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">Contrats de Prêt</h1>
            <p className="text-sm text-muted-foreground">Gérez vos contrats de prêt</p>
          </div>
          <Button
            onClick={() => {
              if (limiteAtteinte) {
                toast({
                  title: "Limite atteinte",
                  description: `Plan gratuit limité à ${LIMITE_GRATUIT} contrats.`,
                  variant: "destructive",
                });
                return;
              }
              setShowForm(!showForm);
            }}
            className="bg-primary text-white gap-1"
          >
            <Plus className="w-4 h-4" /> Nouveau contrat
          </Button>
        </div>

        {/* Bannière limite gratuit */}
        {!isPremium && (
          <div className={`rounded-xl px-4 py-3 flex items-center justify-between gap-3 border ${
            nbPrets >= LIMITE_GRATUIT ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <Crown className={`w-4 h-4 flex-shrink-0 ${nbPrets >= LIMITE_GRATUIT ? "text-red-500" : "text-yellow-600"}`} />
              <p className={`text-xs font-semibold ${nbPrets >= LIMITE_GRATUIT ? "text-red-700" : "text-yellow-700"}`}>
                Contrats : {nbPrets} / {LIMITE_GRATUIT}
                {nbPrets >= LIMITE_GRATUIT && " — Limite atteinte"}
              </p>
            </div>
            <button
              onClick={() => navigate("/abonnement")}
              className="flex-shrink-0 text-xs font-bold bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1.5 rounded-lg"
            >
              Passer Premium
            </button>
          </div>
        )}

        {/* Mur limite atteinte */}
        {limiteAtteinte && !showForm && (
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center mx-auto shadow-md">
              <Crown className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="font-black text-gray-800 text-lg">Limite du plan gratuit atteinte</p>
              <p className="text-gray-500 text-sm mt-1">
                Vous avez atteint les <span className="font-bold">{LIMITE_GRATUIT} contrats</span> inclus dans le plan gratuit.
              </p>
              <p className="text-gray-400 text-xs mt-1">Passez au Premium pour enregistrer sans limite.</p>
            </div>
            <button
              onClick={() => navigate("/abonnement")}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition-all"
            >
              <Crown className="w-4 h-4" /> Passer à Premium
            </button>
          </div>
        )}

        {/* Formulaire */}
        {showForm && !limiteAtteinte && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
            <h2 className="font-bold text-lg text-foreground">Nouveau contrat de prêt</h2>

            {/* Aperçu live avec prêteur éditable inline */}
            <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl p-3 text-sm flex-wrap">
              <input
                value={form.nom_preteur}
                onChange={e => setForm({ ...form, nom_preteur: e.target.value })}
                placeholder="Prêteur"
                className="font-bold text-primary bg-transparent border-none outline-none min-w-[80px] w-auto placeholder:text-primary/50 placeholder:font-bold"
                style={{ width: form.nom_preteur ? `${form.nom_preteur.length + 2}ch` : "80px" }}
              />
              <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="font-bold text-orange-600">{emprunteurLabel}</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">

                <div className="col-span-2">
                  <label className="text-sm font-medium">Nom de l'Emprunteur *</label>
                  <Input
                    value={form.nom_personne}
                    onChange={e => setForm({ ...form, nom_personne: e.target.value })}
                    placeholder="Nom complet de l'emprunteur"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Montant *</label>
                  <Input
                    type="number"
                    value={form.montant}
                    onChange={e => setForm({ ...form, montant: e.target.value })}
                    placeholder="0"
                    className="mt-1"
                    required
                    min="1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Devise *</label>
                  <select
                    value={form.devise}
                    onChange={e => setForm({ ...form, devise: e.target.value as Devise })}
                    className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    required
                  >
                    <option value="XOF">FCFA (XOF)</option>
                    <option value="USD">Dollar (USD)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-sm font-medium">Objectif du prêt *</label>
                  <Input
                    value={form.objectif}
                    onChange={e => setForm({ ...form, objectif: e.target.value })}
                    placeholder="Ex: Achat de matériel, frais médicaux..."
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Date du prêt *</label>
                  <Input
                    type="date"
                    value={form.date_pret}
                    onChange={e => setForm({ ...form, date_pret: e.target.value })}
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Date d'échéance *</label>
                  <Input
                    type="date"
                    value={form.date_echeance}
                    onChange={e => setForm({ ...form, date_echeance: e.target.value })}
                    className="mt-1"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-sm font-medium">Nom du témoin (optionnel)</label>
                  <Input
                    value={form.nom_temoin}
                    onChange={e => setForm({ ...form, nom_temoin: e.target.value })}
                    placeholder="Nom du témoin"
                    className="mt-1"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-sm font-medium">Note (optionnel)</label>
                  <Input
                    value={form.note}
                    onChange={e => setForm({ ...form, note: e.target.value })}
                    placeholder="Note optionnelle..."
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Signatures */}
              <div className="space-y-4 pt-2 border-t border-border">
                <p className="font-semibold text-sm text-primary">Signatures numériques</p>
                <SignaturePad
                  label={`Signature du Prêteur (${form.nom_preteur || "Prêteur"})`}
                  onSave={sig => setForm({ ...form, signature_preteur: sig })}
                />
                <SignaturePad
                  label={`Signature de l'Emprunteur (${emprunteurLabel})`}
                  onSave={sig => setForm({ ...form, signature_emprunteur: sig })}
                />
                {form.nom_temoin && (
                  <SignaturePad
                    label={`Signature du Témoin (${form.nom_temoin})`}
                    onSave={sig => setForm({ ...form, signature_temoin: sig })}
                  />
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
                <Button type="submit" className="bg-primary text-white">Enregistrer le contrat</Button>
              </div>
            </form>
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <div className="text-center text-muted-foreground p-8">Chargement...</div>
        ) : prets.length === 0 ? (
          <div className="text-center p-12 bg-card border border-border rounded-2xl">
            <HandCoins className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun contrat de prêt enregistré</p>
          </div>
        ) : (
          <div className="space-y-3">
            {prets.map(pret => {
              const reste = pret.montant - pret.montant_rembourse;
              const pct = pret.montant > 0 ? Math.min(100, (pret.montant_rembourse / pret.montant) * 100) : 0;
              const isExpanded = expandedId === pret.id;
              const rembList = rembPour(pret.id);
              const preteurNom = pret.nom_preteur || "—";
              const emprunteurNom = pret.nom_personne;

              return (
                <div key={pret.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-orange-100">
                        <HandCoins className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate">{emprunteurNom}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUT_COLORS[pret.statut]}`}>
                            {STATUT_LABELS[pret.statut]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <span className="text-primary font-medium">{preteurNom}</span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="text-orange-600 font-medium">{emprunteurNom}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5">{pret.objectif}</div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-0.5">
                            <Calendar className="w-3 h-3" /> {new Date(pret.date_pret).toLocaleDateString("fr-FR")}
                          </span>
                          {pret.date_echeance && (
                            <span className="text-orange-600">
                              Échéance: {new Date(pret.date_echeance).toLocaleDateString("fr-FR")}
                            </span>
                          )}
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-bold">{formatAmount(pret.montant_rembourse, pret.devise)} remboursé</span>
                            <span className="text-muted-foreground">sur {formatAmount(pret.montant, pret.devise)}</span>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          {pret.statut !== "rembourse" && (
                            <div className="text-xs text-destructive mt-1 font-medium">
                              Reste: {formatAmount(reste, pret.devise)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <button
                          onClick={() => generatePDF(pret)}
                          className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                          title="Télécharger PDF"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : pret.id)}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(pret.id)}
                          className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive hover:text-white text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border bg-muted/30 p-4 space-y-3">
                      {pret.statut !== "rembourse" && (
                        <div>
                          <button
                            onClick={() => setShowRembForm(showRembForm === pret.id ? null : pret.id)}
                            className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                          >
                            <ArrowRight className="w-4 h-4" /> Enregistrer un remboursement
                          </button>
                          {showRembForm === pret.id && (
                            <div className="mt-3 p-3 bg-card border border-border rounded-xl flex flex-wrap gap-2 items-end">
                              <div className="flex-1 min-w-32">
                                <label className="text-xs font-medium">Montant</label>
                                <Input
                                  type="number"
                                  value={rembForm.montant}
                                  onChange={e => setRembForm({ ...rembForm, montant: e.target.value })}
                                  placeholder="0"
                                  className="mt-1 h-8"
                                />
                              </div>
                              <div className="flex-1 min-w-32">
                                <label className="text-xs font-medium">Note</label>
                                <Input
                                  value={rembForm.note}
                                  onChange={e => setRembForm({ ...rembForm, note: e.target.value })}
                                  placeholder="Optionnel"
                                  className="mt-1 h-8"
                                />
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleRemboursement(pret)}
                                className="bg-green-600 hover:bg-green-700 text-white h-8"
                              >
                                Confirmer
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {rembList.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Historique des remboursements</p>
                          <div className="space-y-1.5">
                            {rembList.map(r => (
                              <div key={r.id} className="flex items-center justify-between text-xs bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                                <span className="text-muted-foreground">{new Date(r.date_remboursement).toLocaleDateString("fr-FR")}</span>
                                <span className="font-bold text-green-700">+{formatAmount(r.montant, r.devise)}</span>
                                {r.note && <span className="text-muted-foreground italic">{r.note}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {pret.note && <p className="text-xs text-muted-foreground italic">Note: {pret.note}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
