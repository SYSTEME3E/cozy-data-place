import { useState, useEffect } from "react";
import { Star, Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";
import { useToast } from "@/hooks/use-toast";

interface Avis {
  id: string;
  user_nom: string;
  note: number;
  commentaire: string;
  created_at: string;
}

interface SectionAvisProps {
  produitId?: string;
  annonceId?: string;
  nomItem: string;
}

export default function SectionAvis({ produitId, annonceId, nomItem }: SectionAvisProps) {
  const [note, setNote] = useState(5);
  const [nomComplet, setNomComplet] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [avis, setAvis] = useState<Avis[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const user = getNexoraUser();

  useEffect(() => {
    setNomComplet(user?.nom_prenom || "");
  }, [user?.nom_prenom]);

  const loadAvis = async () => {
    setLoading(true);
    let query = supabase.from("avis_produits" as any).select("*").order("created_at", { ascending: false });
    if (produitId) query = query.eq("produit_id", produitId);
    if (annonceId) query = query.eq("annonce_id", annonceId);
    const { data } = await query;
    setAvis((data || []) as unknown as Avis[]);
    setLoading(false);
  };

  useEffect(() => { loadAvis(); }, [produitId, annonceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentaire.trim()) { toast({ title: "Écrivez un commentaire", variant: "destructive" }); return; }
    if (!user) { toast({ title: "Connectez-vous pour donner un avis", variant: "destructive" }); return; }
    const parts = nomComplet.trim().split(/\s+/).filter(Boolean);
    if (parts.length < 2) { toast({ title: "Nom et prénom obligatoires", description: "Veuillez renseigner votre nom complet.", variant: "destructive" }); return; }
    setSubmitting(true);
    const { error } = await supabase.from("avis_produits" as any).insert({
      user_id: user.id,
      user_nom: nomComplet.trim(),
      produit_id: produitId || null,
      annonce_id: annonceId || null,
      note,
      commentaire: commentaire.trim(),
    });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); }
    else { toast({ title: "✅ Avis publié !" }); setCommentaire(""); setNote(5); loadAvis(); }
    setSubmitting(false);
  };

  const moyenneNote = avis.length > 0 ? (avis.reduce((s, a) => s + a.note, 0) / avis.length).toFixed(1) : "0";

  return (
    <div className="mt-8 space-y-6 border-t pt-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black uppercase tracking-tight">Avis Clients</h3>
          <p className="text-[10px] font-bold text-muted-foreground uppercase">
            {avis.length} avis • Note moyenne : {moyenneNote}/5
          </p>
        </div>
      </div>

      {/* Formulaire d'avis */}
      <form onSubmit={handleSubmit} className="bg-muted/30 p-4 rounded-2xl space-y-4 border border-border">
        <div className="flex flex-col items-center gap-2">
          <p className="text-[10px] font-black text-muted-foreground uppercase">Quelle note donnez-vous ?</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} type="button" onClick={() => setNote(s)} className="transition-transform active:scale-90">
                <Star className={`w-6 h-6 ${note >= s ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
              </button>
            ))}
          </div>
        </div>
        <input
          placeholder="Nom et prénom"
          value={nomComplet}
          onChange={(e) => setNomComplet(e.target.value)}
          className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        />
        <Textarea
          placeholder="Écrivez votre avis ici..."
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          className="bg-background rounded-xl border-border text-sm"
        />
        <Button type="submit" disabled={submitting} className="w-full rounded-xl font-black h-11">
          <Send className="w-4 h-4 mr-2" /> {submitting ? "ENVOI..." : "PUBLIER MON AVIS"}
        </Button>
      </form>

      {/* Liste des avis */}
      {loading ? (
        <div className="text-center py-4 text-muted-foreground text-sm">Chargement...</div>
      ) : avis.length === 0 ? (
        <div className="text-center py-8 bg-muted/20 rounded-2xl border border-dashed border-border">
          <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs font-bold text-muted-foreground uppercase">Soyez le premier à donner votre avis !</p>
        </div>
      ) : (
        <div className="space-y-3">
          {avis.map((a) => (
            <div key={a.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {a.user_nom.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{a.user_nom}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-3.5 h-3.5 ${a.note >= s ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{a.commentaire}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
