import { useState, useEffect } from "react";
import { Eye, EyeOff, Lock, User, Mail, AtSign, ChevronRight, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { registerUser, loginUser, validatePassword, initAdminUser, isNexoraAuthenticated } from "@/lib/nexora-auth";
import { useToast } from "@/hooks/use-toast";
import nexoraLogo from "@/assets/nexora-logo.png";
import { initTheme } from "@/lib/theme";
import PageLoader from "@/components/PageLoader";
import PhoneInputComponent, { COUNTRIES, type CountryOption } from "@/components/PhoneInputComponent";

/* ── PasswordStrength ──────────────────────────────────────────────────────── */
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label:"8 caractères minimum", ok: password.length >= 8 },
    { label:"Une lettre",           ok: /[a-zA-Z]/.test(password) },
    { label:"Un chiffre",           ok: /[0-9]/.test(password) },
    { label:"Un caractère spécial", ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];
  return (
    <div className="mt-1 space-y-1">
      {checks.map(c=>(
        <div key={c.label} className="flex items-center gap-1.5 text-xs">
          {c.ok?<CheckCircle2 className="w-3 h-3 text-green-500"/>:<XCircle className="w-3 h-3 text-muted-foreground"/>}
          <span className={c.ok?"text-green-600":"text-muted-foreground"}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Composant principal : Register ────────────────────────────────────────── */
export default function NexoraRegisterPage() {
  const [loading, setLoading]                   = useState(false);
  const [fullscreenLoading, setFullscreenLoading] = useState(false);
  const [nomPrenom, setNomPrenom]               = useState("");
  const [username, setUsername]                 = useState("");
  const [email, setEmail]                       = useState("");
  const [regPassword, setRegPassword]           = useState("");
  const [confirmPassword, setConfirmPassword]   = useState("");
  const [showRegPassword, setShowRegPassword]   = useState(false);
  const [showConfirm, setShowConfirm]           = useState(false);
  const [whatsapp, setWhatsapp]                 = useState("");
  const defaultCountry = COUNTRIES.find(c=>c.code==="BJ")||COUNTRIES[0];
  const [waCountry, setWaCountry]               = useState<CountryOption>(defaultCountry);
  const [waLocal, setWaLocal]                   = useState("");
  const [waValid, setWaValid]                   = useState(false);
  const [waError, setWaError]                   = useState("");


  const navigate = useNavigate();
  const { toast } = useToast();

  // Spinner 15 secondes
  useEffect(() => {
    initAdminUser();
    initTheme();
    if (isNexoraAuthenticated()) {
      const pinUnlocked = sessionStorage.getItem("nexora_pin_unlocked") === "true";
      navigate(pinUnlocked ? "/dashboard" : "/unlock-pin", { replace: true });
      return;
    }
    const timer = setTimeout(() => {}, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomPrenom.trim()||!username.trim()||!email.trim()||!regPassword) { toast({ title:"Remplissez tous les champs obligatoires", variant:"destructive" }); return; }
    if (!whatsapp.trim()) { setWaError("Numéro WhatsApp requis."); return; }
    if (!waValid) { setWaError("Numéro WhatsApp invalide (minimum 6 chiffres)."); return; }
    setWaError("");
    if (regPassword!==confirmPassword) { toast({ title:"Les mots de passe ne correspondent pas", variant:"destructive" }); return; }
    const validation = validatePassword(regPassword);
    if (!validation.valid) { toast({ title:"Mot de passe invalide", description:validation.error, variant:"destructive" }); return; }
    setLoading(true);
    setFullscreenLoading(true);
    const result = await registerUser({ nom_prenom:nomPrenom, username, email, password:regPassword, whatsapp:whatsapp.trim(), referrer_code:null });
    if (result.success) {
      const loginResult = await loginUser({ identifier:username, password:regPassword, remember:false });
      if (loginResult.success) {
        toast({ title:"✅ Compte créé !", description:"Configurez votre code PIN de sécurité." });
        sessionStorage.removeItem("nexora_pin_unlocked");
        navigate("/setup-pin", { replace:true });
      } else {
        toast({ title:"✅ Compte créé !", description:"Connectez-vous maintenant." });
        navigate("/login", { replace:true });
      }
    } else {
      setFullscreenLoading(false);
      toast({ title:"Erreur d'inscription", description:result.error, variant:"destructive" });
    }
    setLoading(false);
  };

  return (
    <PageLoader duration={600} loading={fullscreenLoading} delayShow={300} minDisplay={500}>
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background:"radial-gradient(ellipse at top, hsl(217 89% 18%) 0%, hsl(217 89% 8%) 100%)" }}>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fade-in { animation: fadeIn 0.4s ease forwards; }
      `}</style>

      <div className="w-full max-w-sm fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <img src={nexoraLogo} alt="Nexora" className="w-16 h-16 object-contain drop-shadow-2xl mb-3"/>
          <h1 className="text-2xl font-black text-white tracking-wider">NEXORA</h1>
          <p className="text-blue-300/70 text-xs mt-1">Plateforme financière tout-en-un</p>
        </div>

        <div className="bg-card dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-white/10">
          <div className="px-6 pt-5 pb-1 text-center">
            <h2 className="text-lg font-black text-white">Créer un compte</h2>
          </div>

          <div className="px-6 py-6">
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5"><User className="w-3.5 h-3.5"/> Nom et Prénom *</label>
                <Input value={nomPrenom} onChange={e=>setNomPrenom(e.target.value)} placeholder="Jean Dupont" className="h-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" autoFocus/>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5"><AtSign className="w-3.5 h-3.5"/> Username *</label>
                <Input value={username} onChange={e=>setUsername(e.target.value.toLowerCase().replace(/[^a-zA-Z0-9_]/g,""))} placeholder="mon_username" className="h-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"/>
                <p className="text-xs text-muted-foreground mt-0.5">Lettres, chiffres et _ uniquement</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5"/> Email *</label>
                <Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="exemple@gmail.com" className="h-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"/>
              </div>
              <div>
                <PhoneInputComponent
                  label="WhatsApp" required value={waLocal}
                  onChange={(full,local)=>{ setWhatsapp(full); setWaLocal(local); setWaValid(local.replace(/\s/g,"").length>=6); setWaError(""); }}
                  selectedCountry={waCountry} onCountryChange={setWaCountry}
                  placeholder="90 00 00 00" error={waError}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5"/> Mot de passe *</label>
                <div className="relative">
                  <Input type={showRegPassword?"text":"password"} value={regPassword} onChange={e=>setRegPassword(e.target.value)} placeholder="Mot de passe sécurisé" className="h-10 pr-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"/>
                  <button type="button" onClick={()=>setShowRegPassword(!showRegPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showRegPassword?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>
                </div>
                {regPassword&&<PasswordStrength password={regPassword}/>}
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5"/> Confirmer le mot de passe *</label>
                <div className="relative">
                  <Input type={showConfirm?"text":"password"} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Confirmer" className="h-10 pr-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"/>
                  <button type="button" onClick={()=>setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showConfirm?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>
                </div>
                {confirmPassword&&regPassword!==confirmPassword&&(<p className="text-xs text-destructive mt-1 flex items-center gap-1"><XCircle className="w-3 h-3"/> Les mots de passe ne correspondent pas.</p>)}
                {confirmPassword&&regPassword===confirmPassword&&confirmPassword.length>0&&(<p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Les mots de passe correspondent.</p>)}
              </div>


              <Button type="submit" disabled={loading} className="w-full h-11 font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2 mt-1">
                {loading?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<><ChevronRight className="w-4 h-4"/> Créer mon compte</>}
              </Button>

              {/* Retour vers login */}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors font-medium flex items-center justify-center gap-1 pt-1"
              >
                <ArrowLeft className="w-3.5 h-3.5"/> J'ai déjà un compte — Se connecter
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-blue-300/50 mt-4">NEXORA © {new Date().getFullYear()} — Plateforme sécurisée</p>
      </div>
    </div>
    </PageLoader>
  );
}
