import { useState, useEffect } from "react";
import { Star, Send, MessageSquare, User } from "lucide-react";
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
  is_verified?: boolean;
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
  const [hoveredStar, setHoveredStar] = useState(0);
  const { toast } = useToast();
  const user = getNexoraUser();

  // Pré-remplir le nom si connecté
  useEffect(() => {
    if (user?.nom_prenom) setNomComplet(user.nom_prenom);
  }, [user?.nom_prenom]);

  const loadAvis = async () => {
    setLoading(true);
    let query = supabase
      .from("avis_produits" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (produitId) query = query.eq("produit_id", produitId);
    if (annonceId) query = query.eq("annonce_id", annonceId);
    const { data } = await query;
    setAvis((data || []) as unknown as Avis[]);
    setLoading(false);
  };

  useEffect(() => { loadAvis(); }, [produitId, annonceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation nom
    if (!nomComplet.trim()) {
      toast({ title: "Votre nom est requis", variant: "destructive" });
      return;
    }
    const parts = nomComplet.trim().split(/\s+/).filter(Boolean);
    if (parts.length < 2) {
      toast({ title: "Nom et prénom obligatoires", description: "Veuillez renseigner votre nom complet.", variant: "destructive" });
      return;
    }

    // Validation commentaire
    if (!commentaire.trim()) {
      toast({ title: "Écrivez un commentaire", variant: "destructive" });
      return;
    }
    if (commentaire.trim().length < 10) {
      toast({ title: "Commentaire trop court", description: "Minimum 10 caractères.", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    // ✅ Fonctionne avec ou sans compte Nexora
    // Si connecté → UUID valide ; sinon NULL (la colonne accepte NULL)
    const userId = user?.id ?? null;
    const isVerified = !!user; // badge "Acheteur vérifié" uniquement si connecté

    const { error } = await supabase.from("avis_produits" as any).insert({
      user_id: userId,
      user_nom: nomComplet.trim(),
      produit_id: produitId || null,
      annonce_id: annonceId || null,
      note,
      commentaire: commentaire.trim(),
      is_verified: isVerified,
    });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Avis publié !", description: "Merci pour votre retour !" });
      setCommentaire("");
      setNote(5);
      if (!user) setNomComplet(""); // vider le nom seulement si anonyme
      loadAvis();
    }
    setSubmitting(false);
  };

  const moyenneNote = avis.length > 0
    ? (avis.reduce((s, a) => s + a.note, 0) / avis.length).toFixed(1)
    : "0";

  const repartition = [5, 4, 3, 2, 1].map((n) => ({
    note: n,
    count: avis.filter((a) => a.note === n).length,
    pct: avis.length > 0 ? Math.round((avis.filter((a) => a.note === n).length / avis.length) * 100) : 0,
  }));

  return (
    <div className="mt-8 space-y-6 border-t pt-8">

      {/* En-tête avec stats */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-black uppercase tracking-tight">Avis Clients</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`w-4 h-4 ${parseFloat(moyenneNote) >= s ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
              ))}
            </div>
            <span className="text-sm font-bold">{moyenneNote}/5</span>
            <span className="text-xs text-muted-foreground">({avis.length} avis)</span>
          </div>
        </div>

        {/* Répartition des notes */}
        {avis.length > 0 && (
          <div className="space-y-1 min-w-[160px]">
            {repartition.map(({ note: n, count, pct }) => (
              <div key={n} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground w-3">{n}</span>
                <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formulaire d'avis — ouvert à tous */}
      <form onSubmit={handleSubmit} className="bg-muted/30 p-4 rounded-2xl space-y-4 border border-border">
        <div>
          <p className="text-[10px] font-black text-muted-foreground uppercase mb-2">
            Donner votre avis sur "{nomItem}"
          </p>

          {/* Étoiles interactives */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setNote(s)}
                onMouseEnter={() => setHoveredStar(s)}
                onMouseLeave={() => setHoveredStar(0)}
                className="transition-transform active:scale-90 hover:scale-110"
              >
                <Star
                  className={`w-7 h-7 transition-colors ${
                    (hoveredStar || note) >= s
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
            <span className="ml-2 text-xs text-muted-foreground font-medium">
              {["", "Très mauvais", "Mauvais", "Moyen", "Bien", "Excellent"][hoveredStar || note]}
            </span>
          </div>
        </div>

        {/* Champ nom — pré-rempli si connecté, sinon vide */}
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            placeholder="Votre nom et prénom *"
            value={nomComplet}
            onChange={(e) => setNomComplet(e.target.value)}
            className="w-full h-11 rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Commentaire */}
        <Textarea
          placeholder="Partagez votre expérience avec ce produit/service... (minimum 10 caractères)"
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          rows={3}
          className="bg-background rounded-xl border-border text-sm resize-none"
        />

        {/* Info discret si non connecté */}
        {!user && (
          <p className="text-[10px] text-muted-foreground">
            💡 Vous n'avez pas besoin d'un compte pour publier un avis. Connectez-vous pour obtenir le badge <span className="font-bold text-primary">Acheteur vérifié</span>.
          </p>
        )}

        <Button type="submit" disabled={submitting} className="w-full rounded-xl font-black h-11">
          <Send className="w-4 h-4 mr-2" />
          {submitting ? "ENVOI EN COURS..." : "PUBLIER MON AVIS"}
        </Button>
      </form>

      {/* Liste des avis */}
      {loading ? (
        <div className="text-center py-6 text-muted-foreground text-sm animate-pulse">Chargement des avis...</div>
      ) : avis.length === 0 ? (
        <div className="text-center py-10 bg-muted/20 rounded-2xl border border-dashed border-border">
          <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-xs font-bold text-muted-foreground uppercase">Soyez le premier à donner votre avis !</p>
          <p className="text-[10px] text-muted-foreground mt-1">Votre opinion compte pour la communauté</p>
        </div>
      ) : (
        <div className="space-y-3">
          {avis.map((a) => (
            <div key={a.id} className="bg-card border border-border rounded-xl p-4 transition-shadow hover:shadow-sm">
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {a.user_nom.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-bold leading-none">{a.user_nom}</p>
                      {a.is_verified && (
                        <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full leading-none">
                          ✓ Acheteur vérifié
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(a.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-3.5 h-3.5 ${a.note >= s ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pl-11">{a.commentaire}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
