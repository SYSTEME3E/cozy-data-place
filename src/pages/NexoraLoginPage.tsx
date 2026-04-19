import { useState, useEffect } from "react";
import { Eye, EyeOff, Lock, User, Mail, AtSign, ChevronRight, CheckCircle2, XCircle, HelpCircle, UserPlus, Shield, KeyRound, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loginUser, registerUser, validatePassword, initAdminUser, isNexoraAuthenticated, updatePasswordById } from "@/lib/nexora-auth";
import { useToast } from "@/hooks/use-toast";
import nexoraLogo from "@/assets/nexora-logo.png";
import { initTheme } from "@/lib/theme";
import PhoneInputComponent, { COUNTRIES, type CountryOption } from "@/components/PhoneInputComponent";
import PinInput from "@/components/auth/PinInput";
import { verifyPin } from "@/services/pinService";
import { supabase } from "@/integrations/supabase/client";


type Mode = "login" | "register" | "forgot";
type ForgotStep = "identity" | "pin" | "newpassword" | "success";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8 caractères minimum",  ok: password.length >= 8 },
    { label: "Une lettre",            ok: /[a-zA-Z]/.test(password) },
    { label: "Un chiffre",            ok: /[0-9]/.test(password) },
    { label: "Un caractère spécial",  ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];
  return (
    <div className="mt-1 space-y-1">
      {checks.map((c) => (
        <div key={c.label} className="flex items-center gap-1.5 text-xs">
          {c.ok
            ? <CheckCircle2 className="w-3 h-3 text-green-500" />
            : <XCircle className="w-3 h-3 text-muted-foreground" />}
          <span className={c.ok ? "text-green-600" : "text-muted-foreground"}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function NexoraLoginPage({ defaultMode }: { defaultMode?: "login" | "register" }) {
  const [searchParams] = useSearchParams();
  const refFromUrl = searchParams.get("ref");
  const [mode, setMode] = useState<Mode>(defaultMode ?? "login");
  const [loading, setLoading]     = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [referrerCode, setReferrerCode] = useState(refFromUrl ?? "");

  // Login fields
  const [identifier, setIdentifier]     = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember]         = useState(false);

  // Register fields
  const [nomPrenom, setNomPrenom]               = useState("");
  const [username, setUsername]                 = useState("");
  const [email, setEmail]                       = useState("");
  const [regPassword, setRegPassword]           = useState("");
  const [confirmPassword, setConfirmPassword]   = useState("");
  const [showRegPassword, setShowRegPassword]   = useState(false);
  const [showConfirm, setShowConfirm]           = useState(false);
  const [whatsapp, setWhatsapp]                 = useState("");
  const defaultCountry = COUNTRIES.find(c => c.code === "BJ") || COUNTRIES[0];
  const [waCountry, setWaCountry]               = useState<CountryOption>(defaultCountry);
  const [waLocal, setWaLocal]                   = useState("");
  const [waFull, setWaFull]                     = useState("");
  const [waValid, setWaValid]                   = useState(false);
  const [waError, setWaError]                   = useState("");

  // Forgot password state
  const [forgotStep, setForgotStep]               = useState<ForgotStep>("identity");
  const [forgotIdentifier, setForgotIdentifier]   = useState("");
  const [forgotUserId, setForgotUserId]           = useState("");
  const [forgotLoadingIdentity, setForgotLoadingIdentity] = useState(false);
  const [forgotLoadingPin, setForgotLoadingPin]   = useState(false);
  const [forgotLoadingReset, setForgotLoadingReset] = useState(false);
  const [forgotPinError, setForgotPinError]       = useState("");
  const [forgotPinShake, setForgotPinShake]       = useState(false);
  const [forgotPinKey, setForgotPinKey]           = useState(0);
  const [newPassword, setNewPassword]             = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword]     = useState(false);
  const [showConfirmNew, setShowConfirmNew]       = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    initAdminUser();
    initTheme();
    if (isNexoraAuthenticated()) {
      const pinUnlocked = sessionStorage.getItem("nexora_pin_unlocked") === "true";
      navigate(pinUnlocked ? "/dashboard" : "/unlock-pin", { replace: true });
      return;
    }
    const ready = setTimeout(() => setPageReady(true), 800);
    return () => clearTimeout(ready);
  }, []);

  const goBackToLogin = () => {
    setMode("login");
    setForgotStep("identity");
    setForgotIdentifier("");
    setForgotUserId("");
    setForgotPinError("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  if (!pageReady) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backgroundColor: "#1a2235", gap: "24px" }}>
        <div style={{ fontSize: "36px", fontWeight: 900, fontFamily: "'Segoe UI', sans-serif", letterSpacing: "0.02em" }}>
          <span style={{ color: "#ffffff" }}>Nex</span>
          <span style={{ color: "#2979ff" }}>ora</span>
        </div>
        <div style={{ width: "38px", height: "38px", borderRadius: "50%", border: "3.5px solid rgba(255,255,255,0.1)", borderTopColor: "#2979ff", animation: "nexora-spin 0.85s cubic-bezier(0.4,0,0.6,1) infinite" }} />
        <style>{`@keyframes nexora-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) { toast({ title: "Remplissez tous les champs", variant: "destructive" }); return; }
    setLoading(true);
    const result = await loginUser({ identifier, password, remember });
    if (result.success) {
      toast({ title: "✅ Connexion réussie !", description: `Bienvenue ${result.user?.nom_prenom?.split(" ")[0]} !` });
      sessionStorage.removeItem("nexora_pin_unlocked");
      sessionStorage.removeItem("nexora_pin_attempts");
      sessionStorage.removeItem("nexora_pin_locked_until");
      navigate("/unlock-pin", { replace: true });
    } else {
      toast({ title: "Connexion échouée", description: result.error, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomPrenom.trim() || !username.trim() || !email.trim() || !regPassword) { toast({ title: "Remplissez tous les champs obligatoires", variant: "destructive" }); return; }
    if (!whatsapp.trim()) { setWaError("Numéro WhatsApp requis."); return; }
    if (!waValid) { setWaError("Numéro WhatsApp invalide (minimum 6 chiffres)."); return; }
    setWaError("");
    if (regPassword !== confirmPassword) { toast({ title: "Les mots de passe ne correspondent pas", variant: "destructive" }); return; }
    const validation = validatePassword(regPassword);
    if (!validation.valid) { toast({ title: "Mot de passe invalide", description: validation.error, variant: "destructive" }); return; }
    setLoading(true);
    const result = await registerUser({ nom_prenom: nomPrenom, username, email, password: regPassword, whatsapp: whatsapp.trim(), referrer_code: referrerCode || null });
    if (result.success) {
      // Connecter automatiquement et rediriger vers setup-pin
      const loginResult = await loginUser({ identifier: username, password: regPassword, remember: false });
      if (loginResult.success) {
        toast({ title: "✅ Compte créé !", description: "Configurez votre code PIN de sécurité." });
        sessionStorage.removeItem("nexora_pin_unlocked");
        navigate("/setup-pin", { replace: true });
      } else {
        toast({ title: "✅ Compte créé !", description: "Connectez-vous maintenant." });
        setMode("login");
        setIdentifier(username);
      }
    } else {
      toast({ title: "Erreur d'inscription", description: result.error, variant: "destructive" });
    }
    setLoading(false);
  };

  // ÉTAPE 1 : Vérifier l'identifiant
  const handleForgotIdentity = async () => {
    if (!forgotIdentifier.trim()) { toast({ title: "Champ requis", description: "Entrez votre username ou email.", variant: "destructive" }); return; }
    setForgotLoadingIdentity(true);
    const id = forgotIdentifier.trim().toLowerCase();
    let foundUser: { id: string; has_set_pin: boolean } | null = null;
    const { data: byUsername } = await (supabase as any)
      .from("nexora_users")
      .select("id, has_set_pin")
      .eq("username", id)
      .eq("is_active", true)
      .maybeSingle();
    if (byUsername) {
      foundUser = byUsername;
    } else {
      const { data: byEmail } = await (supabase as any)
        .from("nexora_users")
        .select("id, has_set_pin")
        .eq("email", id)
        .eq("is_active", true)
        .maybeSingle();
      if (byEmail) foundUser = byEmail;
    }
    setForgotLoadingIdentity(false);
    if (!foundUser) { toast({ title: "Compte introuvable", description: "Aucun compte actif avec cet identifiant.", variant: "destructive" }); return; }
    if (!foundUser.has_set_pin) { toast({ title: "Code PIN non configuré", description: "Connectez-vous d'abord et configurez votre code PIN.", variant: "destructive" }); return; }
    setForgotUserId(foundUser.id);
    setForgotStep("pin");
  };

  // ÉTAPE 2 : Vérifier le PIN
  const handleForgotPin = async (pin: string) => {
    if (!forgotUserId) return;
    setForgotLoadingPin(true);
    const correct = await verifyPin(forgotUserId, pin);
    setForgotLoadingPin(false);
    if (!correct) {
      setForgotPinError("Code PIN incorrect. Réessayez.");
      setForgotPinShake(true);
      setTimeout(() => { setForgotPinShake(false); setForgotPinKey(k => k + 1); }, 500);
      return;
    }
    setForgotPinError("");
    setForgotStep("newpassword");
  };

  // ÉTAPE 3 : Sauvegarder nouveau mot de passe
  const handleForgotReset = async () => {
    if (!newPassword || !confirmNewPassword) { toast({ title: "Remplissez tous les champs", variant: "destructive" }); return; }
    if (newPassword !== confirmNewPassword) { toast({ title: "Les mots de passe ne correspondent pas", variant: "destructive" }); return; }
    const validation = validatePassword(newPassword);
    if (!validation.valid) { toast({ title: "Mot de passe invalide", description: validation.error, variant: "destructive" }); return; }
    setForgotLoadingReset(true);
    const result = await updatePasswordById(forgotUserId, newPassword);
    setForgotLoadingReset(false);
    if (!result.success) { 
      console.error("Erreur reset mot de passe:", result.error);
      toast({ title: "Erreur", description: result.error || "Impossible de mettre à jour le mot de passe.", variant: "destructive" }); 
      return; 
    }
    setForgotStep("success");
  };

  const FORGOT_STEPS: ForgotStep[] = ["identity", "pin", "newpassword", "success"];

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "radial-gradient(ellipse at top, hsl(217 89% 18%) 0%, hsl(217 89% 8%) 100%)" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.4s ease forwards; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .slide-in { animation: slideIn 0.3s ease forwards; }
      `}</style>

      <div className="w-full max-w-sm fade-in">
        <div className="flex flex-col items-center mb-6">
          <img src={nexoraLogo} alt="Nexora" className="w-16 h-16 object-contain drop-shadow-2xl mb-3" />
          <h1 className="text-2xl font-black text-white tracking-wider">NEXORA</h1>
          <p className="text-blue-300/70 text-xs mt-1">Plateforme financière tout-en-un</p>
        </div>

        <div className="bg-card dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-white/10">
          {mode !== "forgot" && (
            <div className="flex border-b border-border dark:border-gray-800">
              <button onClick={() => setMode("login")} className={`flex-1 py-3 text-sm font-bold transition-colors ${mode === "login" ? "text-primary border-b-2 border-primary bg-primary-bg dark:bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}>Se connecter</button>
              <button onClick={() => setMode("register")} className={`flex-1 py-3 text-sm font-bold transition-colors ${mode === "register" ? "text-primary border-b-2 border-primary bg-primary-bg dark:bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}>S'inscrire</button>
            </div>
          )}

          <div className="px-6 py-6">

            {/* CONNEXION */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Username ou Email</label>
                  <Input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="username ou email@example.com" className="h-11 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" autoFocus />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Mot de passe</label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="h-11 pr-12 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="remember" checked={remember} onChange={e => setRemember(e.target.checked)} className="rounded" />
                    <label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer">Restez connecté</label>
                  </div>
                  <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline font-medium flex items-center gap-1"><HelpCircle className="w-3 h-3" /> Mot de passe oublié ?</button>
                </div>
                <Button type="submit" disabled={loading} className="w-full h-11 font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Lock className="w-4 h-4" /> Se connecter</>}
                </Button>
              </form>
            )}

            {/* INSCRIPTION */}
            {mode === "register" && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Nom et Prénom *</label>
                  <Input value={nomPrenom} onChange={e => setNomPrenom(e.target.value)} placeholder="Jean Dupont" className="h-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" autoFocus />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5"><AtSign className="w-3.5 h-3.5" /> Username *</label>
                  <Input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-zA-Z0-9_]/g, ""))} placeholder="mon_username" className="h-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" />
                  <p className="text-xs text-muted-foreground mt-0.5">Lettres, chiffres et _ uniquement</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email *</label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="exemple@gmail.com" className="h-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" />
                </div>
                <div>
                  <PhoneInputComponent
                    label="WhatsApp"
                    required
                    value={waLocal}
                    onChange={(full, local, country) => {
                      setWaFull(full);
                      setWaLocal(local);
                      setWhatsapp(full);
                      setWaValid(local.replace(/\s/g, "").length >= 6);
                      setWaError("");
                    }}
                    selectedCountry={waCountry}
                    onCountryChange={setWaCountry}
                    placeholder="90 00 00 00"
                    error={waError}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Mot de passe *</label>
                  <div className="relative">
                    <Input type={showRegPassword ? "text" : "password"} value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Mot de passe sécurisé" className="h-10 pr-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" />
                    <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div>
                  {regPassword && <PasswordStrength password={regPassword} />}
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Confirmer le mot de passe *</label>
                  <div className="relative">
                    <Input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirmer" className="h-10 pr-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div>
                  {confirmPassword && regPassword !== confirmPassword && (<p className="text-xs text-destructive mt-1 flex items-center gap-1"><XCircle className="w-3 h-3" /> Les mots de passe ne correspondent pas.</p>)}
                  {confirmPassword && regPassword === confirmPassword && confirmPassword.length > 0 && (<p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Les mots de passe correspondent.</p>)}
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5 text-primary" /> Code parrain {referrerCode ? "✅" : "(optionnel)"}</label>
                  <Input value={referrerCode} onChange={e => setReferrerCode(e.target.value.trim())} placeholder="Entrez un code de parrainage" className={`h-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 ${refFromUrl ? "border-primary/60 bg-primary/5" : ""}`} readOnly={!!refFromUrl} />
                  {refFromUrl && (<p className="text-xs text-primary mt-0.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Parrain détecté automatiquement depuis le lien</p>)}
                </div>
                <Button type="submit" disabled={loading} className="w-full h-11 font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2 mt-1">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><ChevronRight className="w-4 h-4" /> Créer mon compte</>}
                </Button>
              </form>
            )}

            {/* MOT DE PASSE OUBLIÉ */}
            {mode === "forgot" && (
              <div className="space-y-5 slide-in">

                {/* Indicateur d'étapes */}
                <div className="flex items-center justify-center gap-2 mb-1">
                  {FORGOT_STEPS.map((step, i) => (
                    <div key={step} className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${forgotStep === step ? "bg-primary text-white scale-110" : FORGOT_STEPS.indexOf(forgotStep) > i ? "bg-green-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-400"}`}>
                        {FORGOT_STEPS.indexOf(forgotStep) > i ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      {i < 3 && <div className={`w-6 h-0.5 rounded ${FORGOT_STEPS.indexOf(forgotStep) > i ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"}`} />}
                    </div>
                  ))}
                </div>

                {/* ÉTAPE 1 : Identifiant */}
                {forgotStep === "identity" && (
                  <div className="space-y-4 slide-in">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3"><User className="w-6 h-6 text-blue-600 dark:text-blue-400" /></div>
                      <h2 className="font-black text-base text-gray-900 dark:text-white">Votre identifiant</h2>
                      <p className="text-xs text-muted-foreground mt-1">Entrez votre username ou email</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Username ou Email</label>
                      <Input value={forgotIdentifier} onChange={e => setForgotIdentifier(e.target.value)} placeholder="username ou email@example.com" className="h-11 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" autoFocus onKeyDown={e => e.key === "Enter" && handleForgotIdentity()} />
                    </div>
                    <Button onClick={handleForgotIdentity} disabled={forgotLoadingIdentity || !forgotIdentifier.trim()} className="w-full h-11 font-bold bg-primary hover:bg-primary/90 rounded-xl gap-2">
                      {forgotLoadingIdentity ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><ChevronRight className="w-4 h-4" /> Continuer</>}
                    </Button>
                  </div>
                )}

                {/* ÉTAPE 2 : Code PIN */}
                {forgotStep === "pin" && (
                  <div className="space-y-4 slide-in">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-3"><Shield className="w-6 h-6 text-amber-600 dark:text-amber-400" /></div>
                      <h2 className="font-black text-base text-gray-900 dark:text-white">Vérification PIN</h2>
                      <p className="text-xs text-muted-foreground mt-1">Entrez votre code PIN à 4 chiffres pour confirmer votre identité</p>
                    </div>
                    <div className="py-2">
                      {forgotLoadingPin ? (
                        <div className="flex justify-center py-4"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
                      ) : (
                        <PinInput key={forgotPinKey} onComplete={handleForgotPin} error={!!forgotPinError} shake={forgotPinShake} disabled={forgotLoadingPin} />
                      )}
                    </div>
                    {forgotPinError && (
                      <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                        <XCircle className="w-4 h-4 flex-shrink-0" />{forgotPinError}
                      </div>
                    )}
                    <button onClick={() => { setForgotStep("identity"); setForgotPinError(""); }} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1">
                      <ArrowLeft className="w-3 h-3" /> Changer d'identifiant
                    </button>
                  </div>
                )}

                {/* ÉTAPE 3 : Nouveau mot de passe */}
                {forgotStep === "newpassword" && (
                  <div className="space-y-4 slide-in">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3"><KeyRound className="w-6 h-6 text-green-600 dark:text-green-400" /></div>
                      <h2 className="font-black text-base text-gray-900 dark:text-white">Nouveau mot de passe</h2>
                      <p className="text-xs text-muted-foreground mt-1">PIN vérifié ✅ — Choisissez un nouveau mot de passe</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Nouveau mot de passe</label>
                      <div className="relative">
                        <Input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nouveau mot de passe sécurisé" className="h-11 pr-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" autoFocus />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                      </div>
                      {newPassword && <PasswordStrength password={newPassword} />}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Confirmer le mot de passe</label>
                      <div className="relative">
                        <Input type={showConfirmNew ? "text" : "password"} value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} placeholder="Confirmer" className="h-11 pr-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" />
                        <button type="button" onClick={() => setShowConfirmNew(!showConfirmNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showConfirmNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                      </div>
                      {confirmNewPassword && newPassword !== confirmNewPassword && (<p className="text-xs text-destructive mt-1 flex items-center gap-1"><XCircle className="w-3 h-3" /> Les mots de passe ne correspondent pas.</p>)}
                      {confirmNewPassword && newPassword === confirmNewPassword && confirmNewPassword.length > 0 && (<p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Les mots de passe correspondent.</p>)}
                    </div>
                    <Button onClick={handleForgotReset} disabled={forgotLoadingReset || !newPassword || !confirmNewPassword} className="w-full h-11 font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl gap-2">
                      {forgotLoadingReset ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Réinitialiser le mot de passe</>}
                    </Button>
                  </div>
                )}

                {/* ÉTAPE 4 : Succès */}
                {forgotStep === "success" && (
                  <div className="space-y-4 text-center slide-in">
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-9 h-9 text-green-500" />
                    </div>
                    <div>
                      <h2 className="font-black text-lg text-gray-900 dark:text-white">Mot de passe modifié !</h2>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.</p>
                    </div>
                    <Button onClick={goBackToLogin} className="w-full h-11 font-bold bg-primary hover:bg-primary/90 rounded-xl gap-2">
                      <Lock className="w-4 h-4" /> Se connecter maintenant
                    </Button>
                  </div>
                )}

                {forgotStep !== "success" && (
                  <button onClick={goBackToLogin} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors font-medium flex items-center justify-center gap-1">
                    <ArrowLeft className="w-3.5 h-3.5" /> Retour à la connexion
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-blue-300/50 mt-4">NEXORA © {new Date().getFullYear()} — Plateforme sécurisée</p>
      </div>
    </div>
  );
}
