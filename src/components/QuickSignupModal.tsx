/**
 * NEXORA — Modal d'inscription rapide
 * Affiché quand un visiteur non connecté clique sur "Acheter"
 * ⚡ Inscription en ~10 secondes, sans quitter la page
 */

import { useState } from "react";
import { X, Loader2, UserPlus, Eye, EyeOff } from "lucide-react";
import { registerUser, loginUser } from "@/lib/nexora-auth";
import { useToast } from "@/hooks/use-toast";

interface QuickSignupModalProps {
  open: boolean;
  onClose: () => void;
  /** Appelé une fois l'utilisateur inscrit & connecté — continuer vers l'achat */
  onSuccess: () => void;
  /** Code affilié pré-rempli (URL ?ref=) */
  affiliateRef?: string | null;
  /** Titre de la formation pour personnaliser le message */
  formationTitre?: string;
}

export default function QuickSignupModal({
  open,
  onClose,
  onSuccess,
  affiliateRef,
  formationTitre,
}: QuickSignupModalProps) {
  const { toast } = useToast();

  const [nom, setNom]           = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!nom.trim() || !username.trim() || !email.trim() || !password.trim()) {
      toast({ title: "Champs requis", description: "Tous les champs sont obligatoires.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Mot de passe trop court", description: "Minimum 6 caractères.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Inscription
      const reg = await registerUser({
        nom_prenom: nom.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
        referrer_code: affiliateRef || null,
      });

      if (!reg.success) {
        toast({ title: "Erreur inscription", description: reg.error, variant: "destructive" });
        return;
      }

      // Auto-login
      const login = await loginUser({ identifier: email.trim().toLowerCase(), password });
      if (!login.success) {
        toast({ title: "Compte créé ✅", description: "Connectez-vous pour continuer.", variant: "destructive" });
        onClose();
        return;
      }

      toast({ title: "Compte créé ✅", description: "Vous êtes connecté ! Finalisation de l'achat…" });
      // Petit délai pour que l'état auth se propage
      setTimeout(() => {
        onSuccess();
      }, 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="relative bg-gradient-to-br from-red-600 to-red-800 p-6 text-white text-center">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
            <UserPlus className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black">Créer mon compte</h2>
          <p className="text-xs text-white/80 mt-1">
            {formationTitre
              ? `Pour accéder à « ${formationTitre} »`
              : "Inscrivez-vous pour continuer vers le paiement"}
          </p>
        </div>

        {/* Formulaire */}
        <div className="p-5 space-y-3">
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Nom complet"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              disabled={loading}
              className="w-full h-11 rounded-xl border border-border bg-background px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
            />
            <input
              type="text"
              placeholder="Nom d'utilisateur"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
              disabled={loading}
              className="w-full h-11 rounded-xl border border-border bg-background px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full h-11 rounded-xl border border-border bg-background px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
            />
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                placeholder="Mot de passe (min. 6 caractères)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full h-11 rounded-xl border border-border bg-background px-3.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {affiliateRef && affiliateRef !== "public" && (
            <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-500/10 px-3 py-2 rounded-xl">
              <span className="text-emerald-500">✅</span>
              Code parrain détecté : <span className="font-bold">{affiliateRef}</span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-red-600/30 disabled:opacity-60"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Création du compte…</>
            ) : (
              <><UserPlus className="w-5 h-5" /> Créer mon compte et continuer</>
            )}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            ⚡ Inscription en 10 secondes — sans carte bancaire
          </p>
        </div>
      </div>
    </div>
  );
}
