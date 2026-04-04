import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hashPassword } from "@/lib/nexora-auth";
import { playSuccessSound } from "@/lib/app-utils";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  User, Key, Save, Mail, AtSign,
  BadgeCheck, Crown, Zap, Camera, CheckCircle2, X
} from "lucide-react";
import { getNexoraUser } from "@/lib/nexora-auth";
import { Link } from "react-router-dom";



export default function ProfilPage() {
  const nexoraUser = getNexoraUser();
  const [nom, setNom] = useState(nexoraUser?.nom_prenom || "");
  const [email, setEmail] = useState(nexoraUser?.email || "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(nexoraUser?.avatar_url || "");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const isAdmin = nexoraUser?.is_admin;
  const isPremium = nexoraUser?.plan === "boss" || nexoraUser?.plan === "roi" || isAdmin;
  const hasBadge = isPremium || isAdmin;

  // ── Sauvegarder profil
  const handleSaveProfile = async () => {
    if (!nexoraUser) return;
    setSaving(true);
    const { error } = await supabase
      .from("nexora_users" as any)
      .update({ nom_prenom: nom, email })
      .eq("id", nexoraUser.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    playSuccessSound();
    toast({ title: "Profil mis à jour !" });

    // Mettre à jour le localStorage
    const stored =
      localStorage.getItem("nexora_current_user") ||
      sessionStorage.getItem("nexora_current_user");
    if (stored) {
      const user = JSON.parse(stored);
      const updated = { ...user, nom_prenom: nom, email };
      if (localStorage.getItem("nexora_current_user")) {
        localStorage.setItem("nexora_current_user", JSON.stringify(updated));
      } else {
        sessionStorage.setItem("nexora_current_user", JSON.stringify(updated));
      }
    }
  };

  // ── Changer mot de passe
  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast({ title: "Remplissez tous les champs", variant: "destructive" }); return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Les mots de passe ne correspondent pas", variant: "destructive" }); return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Minimum 8 caractères", variant: "destructive" }); return;
    }
    if (!nexoraUser) return;

    const oldHash = await hashPassword(oldPassword);
    const { data: check } = await supabase
      .from("nexora_users" as any)
      .select("id")
      .eq("id", nexoraUser.id)
      .eq("password_hash", oldHash)
      .maybeSingle();

    if (!check) {
      toast({ title: "Ancien mot de passe incorrect", variant: "destructive" }); return;
    }

    const newHash = await hashPassword(newPassword);
    await supabase
      .from("nexora_users" as any)
      .update({ password_hash: newHash })
      .eq("id", nexoraUser.id);

    playSuccessSound();
    toast({ title: "Mot de passe modifié !" });
    setOldPassword(""); setNewPassword(""); setConfirmPassword("");
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up pb-10">

        <h1 className="font-display font-bold text-xl flex items-center gap-2">
          <User className="w-6 h-6 text-primary" /> Mon Profil
        </h1>

        {/* ════════════════════════════
            CARTE PROFIL
        ════════════════════════════ */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">

          {/* Avatar + infos */}
          <div className="flex items-center gap-5">

            {/* ── Avatar avec upload ── */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary shadow-brand bg-muted flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-muted-foreground" />
                )}
              </div>

              {/* Bouton caméra pour changer la photo */}
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-2 border-background shadow-md hover:opacity-90 transition-opacity"
                title="Changer la photo"
              >
                <Camera className="w-4 h-4 text-primary-foreground" />
              </button>

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !nexoraUser) return;
                  setUploadingAvatar(true);
                  try {
                    const ext = file.name.split(".").pop();
                    const path = `avatars/${nexoraUser.id}_${Date.now()}.${ext}`;
                    const { error } = await supabase.storage.from("mes-secrets-media").upload(path, file, { upsert: true });
                    if (error) throw error;
                    const { data: urlData } = supabase.storage.from("mes-secrets-media").getPublicUrl(path);
                    const newUrl = urlData.publicUrl;
                    setAvatarUrl(newUrl);
                    await supabase.from("nexora_users" as any).update({ avatar_url: newUrl }).eq("id", nexoraUser.id);
                    // Update localStorage
                    const stored = localStorage.getItem("nexora_current_user") || sessionStorage.getItem("nexora_current_user");
                    if (stored) {
                      const user = JSON.parse(stored);
                      const updated = { ...user, avatar_url: newUrl };
                      if (localStorage.getItem("nexora_current_user")) localStorage.setItem("nexora_current_user", JSON.stringify(updated));
                      else sessionStorage.setItem("nexora_current_user", JSON.stringify(updated));
                    }
                    playSuccessSound();
                    toast({ title: "Photo de profil mise à jour !" });
                  } catch (err: any) {
                    toast({ title: "Erreur", description: err.message, variant: "destructive" });
                  }
                  setUploadingAvatar(false);
                }}
              />

              {/* Badge bleu rond style Facebook */}
              {hasBadge && (
                <div className="absolute -bottom-1 -left-1 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center border-2 border-background shadow-md"
                  title={isAdmin ? "Administrateur" : "Compte Premium"}>
                  <BadgeCheck className="w-4 h-4 text-white fill-white" />
                </div>
              )}
            </div>

            {/* Infos utilisateur */}
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-lg flex items-center gap-2 flex-wrap">
                <span className="truncate">{nom || "Utilisateur"}</span>
                {hasBadge && (
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-500 rounded-full flex-shrink-0"
                    title={isAdmin ? "Administrateur" : "Premium"}>
                    <BadgeCheck className="w-3 h-3 text-white" />
                  </span>
                )}
              </div>

              <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{email}</span>
              </div>

              {/* Badges de statut */}
              <div className="flex gap-2 mt-2 flex-wrap">
                {isAdmin && (
                  <span className="text-xs bg-amber-50 text-amber-700 font-bold px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Administrateur
                  </span>
                )}
                {isPremium && !isAdmin && (
                  <span className="text-xs bg-blue-500 text-white font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <BadgeCheck className="w-3 h-3" /> Premium
                  </span>
                )}
                {!isPremium && !isAdmin && (
                  <span className="text-xs bg-muted text-muted-foreground font-semibold px-2.5 py-1 rounded-full border border-border">
                    Plan Gratuit
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Note upload */}
          <div className="bg-muted/50 border border-border rounded-xl p-3 flex items-center gap-2">
            <Camera className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              {uploadingAvatar ? "Upload en cours..." : "Cliquez sur l'icône caméra pour changer votre photo de profil."}
            </p>
          </div>

          <div className="h-px bg-border" />

          {/* Formulaire infos */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <AtSign className="w-4 h-4" /> Nom complet
              </label>
              <Input
                value={nom}
                onChange={e => setNom(e.target.value)}
                placeholder="Votre nom complet"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Mail className="w-4 h-4" /> Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
              />
            </div>
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full bg-primary text-primary-foreground gap-2">
              <Save className="w-4 h-4" />
              {saving ? "Enregistrement..." : "Sauvegarder le profil"}
            </Button>
          </div>
        </div>

        {/* ════════════════════════════
            FONCTIONNALITÉS DISPONIBLES
        ════════════════════════════ */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-display font-bold flex items-center gap-2 text-base">
            <User className="w-5 h-5 text-primary" /> Mes fonctionnalités
          </h2>

          <div className="space-y-2">
            {[
              { label: "Factures", detail: isPremium ? "Illimité" : "5 max", ok: true },
              { label: "Coffre-fort", detail: isPremium ? "Illimité" : "10 comptes max", ok: true },
              { label: "Liens & Contacts", detail: "Illimité", ok: true },
              { label: "Tableau de bord", detail: "Disponible", ok: true },
              { label: "Historique", detail: "Disponible", ok: true },
              { label: "Boutique", detail: isPremium ? "Disponible" : "Premium uniquement", ok: isPremium },
              { label: "Entrées & Dépenses", detail: isPremium ? "Illimité" : "Premium uniquement", ok: isPremium },
              { label: "Investissements", detail: isPremium ? "Illimité" : "Premium uniquement", ok: isPremium },
              { label: "Prêts & Dettes", detail: isPremium ? "Illimité" : "Premium uniquement", ok: isPremium },
              { label: "Médias", detail: isPremium ? "Illimité" : "Premium uniquement", ok: isPremium },
              { label: "🏠 Marché Immobilier", detail: isPremium ? "Publication disponible" : "Premium uniquement", ok: isPremium },
            ].map((f) => (
              <div key={f.label}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm ${
                  f.ok
                    ? "bg-green-50 border border-green-100"
                    : "bg-gray-50 border border-gray-100 opacity-60"
                }`}>
                <div className="flex items-center gap-2">
                  {f.ok
                    ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    : <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                  }
                  <span className={`font-medium ${f.ok ? "text-gray-700" : "text-gray-400 line-through"}`}>
                    {f.label}
                  </span>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  f.ok
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-200 text-gray-500"
                }`}>
                  {f.detail}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ════════════════════════════
            BANNIÈRE UPGRADE (si gratuit)
        ════════════════════════════ */}
        {!isPremium && (
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl p-5 text-white flex items-center gap-4">
            <Zap className="w-10 h-10 text-yellow-300 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-black text-base">Passez au Premium</div>
              <div className="text-sm text-white/80 mt-0.5">
                Toutes les fonctionnalités illimitées + Badge bleu ✓ sur votre profil
              </div>
            </div>
            <Link
              to="/abonnement"
              className="bg-white text-violet-700 font-bold text-sm px-4 py-2 rounded-lg flex-shrink-0 hover:bg-gray-100 transition-colors">
              Voir les plans
            </Link>
          </div>
        )}

        {/* ════════════════════════════
            CHANGER MOT DE PASSE
        ════════════════════════════ */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div>
            <h2 className="font-display font-bold flex items-center gap-2 text-base">
              <Key className="w-5 h-5 text-primary" /> Changer le mot de passe
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Minimum 8 caractères avec lettre, chiffre et caractère spécial.
            </p>
          </div>
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="Ancien mot de passe"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Nouveau mot de passe (min 8 car.)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Confirmer le nouveau mot de passe"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <X className="w-3 h-3" /> Les mots de passe ne correspondent pas
              </p>
            )}
            {newPassword && confirmPassword && newPassword === confirmPassword && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Les mots de passe correspondent
              </p>
            )}
            <Button
              onClick={handleChangePassword}
              className="w-full bg-primary text-primary-foreground gap-2">
              <Key className="w-4 h-4" /> Modifier le mot de passe
            </Button>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
