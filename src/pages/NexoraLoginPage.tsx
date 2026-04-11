import { useState, useEffect } from "react";
import { Eye, EyeOff, Lock, User, Mail, AtSign, ChevronRight, CheckCircle2, XCircle, Phone, MessageCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { loginUser, registerUser, validatePassword, initAdminUser, isNexoraAuthenticated } from "@/lib/nexora-auth";
import { useToast } from "@/hooks/use-toast";
import nexoraLogo from "@/assets/nexora-logo.png";
import { initTheme } from "@/lib/theme";

type Mode = "login" | "register" | "forgot";

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

export default function NexoraLoginPage() {
  const [mode, setMode]           = useState<Mode>("login");
  const [loading, setLoading]     = useState(false);
  const [pageReady, setPageReady] = useState(false);

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

  // ── Splash screen — Nexora Spinner
  if (!pageReady) {
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
        backgroundColor: "#1a2235",
      }}>
        <div style={{
          fontSize: "40px",
          fontWeight: 900,
          letterSpacing: "0.08em",
          fontFamily: "'Segoe UI', sans-serif",
        }}>
          <span style={{ color: "#ffffff" }}>Nex</span>
          <span style={{ color: "#2979ff" }}>ora</span>
        </div>
        <div style={{
          width: "38px",
          height: "38px",
          borderRadius: "50%",
          border: "3.5px solid rgba(255,255,255,0.1)",
          borderTopColor: "#2979ff",
          animation: "nexora-spin 0.85s cubic-bezier(0.4,0,0.6,1) infinite",
        }} />
        <style>{`
          @keyframes nexora-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      toast({ title: "Remplissez tous les champs", variant: "destructive" }); return;
    }
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
    if (!nomPrenom.trim() || !username.trim() || !email.trim() || !regPassword) {
      toast({ title: "Remplissez tous les champs obligatoires", variant: "destructive" }); return;
    }
    if (!whatsapp.trim()) {
      toast({ title: "Numéro WhatsApp obligatoire", description: "Veuillez entrer votre numéro WhatsApp.", variant: "destructive" }); return;
    }
    if (!/^\+?[0-9]{8,15}$/.test(whatsapp.replace(/\s/g, ""))) {
      toast({ title: "Numéro invalide", description: "Entrez un numéro valide (ex: +22990000000).", variant: "destructive" }); return;
    }
    if (regPassword !== confirmPassword) {
      toast({ title: "Les mots de passe ne correspondent pas", variant: "destructive" }); return;
    }
    const validation = validatePassword(regPassword);
    if (!validation.valid) {
      toast({ title: "Mot de passe invalide", description: validation.error, variant: "destructive" }); return;
    }
    setLoading(true);
    const result = await registerUser({ nom_prenom: nomPrenom, username, email, password: regPassword, whatsapp: whatsapp.trim() });
    if (result.success) {
      toast({ title: "✅ Compte créé !", description: "Connectez-vous maintenant." });
      setMode("login");
      setIdentifier(username);
    } else {
      toast({ title: "Erreur d'inscription", description: result.error, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse at top, hsl(217 89% 18%) 0%, hsl(217 89% 8%) 100%)" }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeIn 0.4s ease forwards; }
      `}</style>

      <div className="w-full max-w-sm fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <img src={nexoraLogo} alt="Nexora" className="w-16 h-16 object-contain drop-shadow-2xl mb-3" />
          <h1 className="text-2xl font-black text-white tracking-wider">NEXORA</h1>
          <p className="text-blue-300/70 text-xs mt-1">Plateforme financière tout-en-un</p>
        </div>

        {/* Carte principale */}
        <div className="bg-card dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-white/10">
          {mode !== "forgot" && (
            <div className="flex border-b border-border dark:border-gray-800">
              <button
                onClick={() => setMode("login")}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${
                  mode === "login"
                    ? "text-primary border-b-2 border-primary bg-primary-bg dark:bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                Se connecter
              </button>
              <button
                onClick={() => setMode("register")}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${
                  mode === "register"
                    ? "text-primary border-b-2 border-primary bg-primary-bg dark:bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                S'inscrire
              </button>
            </div>
          )}

          <div className="px-6 py-6">

            {/* ── CONNEXION ── */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Username ou Email
                  </label>
                  <Input
                    value={identifier} onChange={e => setIdentifier(e.target.value)}
                    placeholder="username ou email@example.com"
                    className="h-11 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Mot de passe
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-11 pr-12 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="remember" checked={remember}
                      onChange={e => setRemember(e.target.checked)} className="rounded" />
                    <label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer">
                      Restez connecté
                    </label>
                  </div>
                  <button type="button" onClick={() => setMode("forgot")}
                    className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
                    <HelpCircle className="w-3 h-3" /> Mot de passe oublié ?
                  </button>
                </div>

                <Button type="submit" disabled={loading}
                  className="w-full h-11 font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2">
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Lock className="w-4 h-4" /> Se connecter</>
                  }
                </Button>
              </form>
            )}

            {/* ── INSCRIPTION ── */}
            {mode === "register" && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Nom et Prénom *
                  </label>
                  <Input value={nomPrenom} onChange={e => setNomPrenom(e.target.value)}
                    placeholder="Jean Dupont" className="h-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" autoFocus />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                    <AtSign className="w-3.5 h-3.5" /> Username *
                  </label>
                  <Input value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-zA-Z0-9_]/g, ""))}
                    placeholder="mon_username" className="h-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" />
                  <p className="text-xs text-muted-foreground mt-0.5">Lettres, chiffres et _ uniquement</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Email *
                  </label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="exemple@gmail.com" className="h-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-green-500" /> WhatsApp *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-green-500">WA</span>
                    <Input
                      type="tel"
                      value={whatsapp}
                      onChange={e => setWhatsapp(e.target.value)}
                      placeholder="+229 90 00 00 00"
                      className="h-10 pl-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Numéro avec indicatif pays (ex: +229...)</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Mot de passe *
                  </label>
                  <div className="relative">
                    <Input type={showRegPassword ? "text" : "password"} value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      placeholder="Mot de passe sécurisé" className="h-10 pr-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" />
                    <button type="button" onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {regPassword && <PasswordStrength password={regPassword} />}
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Confirmer le mot de passe *
                  </label>
                  <div className="relative">
                    <Input type={showConfirm ? "text" : "password"} value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirmer" className="h-10 pr-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && regPassword !== confirmPassword && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Les mots de passe ne correspondent pas.
                    </p>
                  )}
                  {confirmPassword && regPassword === confirmPassword && confirmPassword.length > 0 && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Les mots de passe correspondent.
                    </p>
                  )}
                </div>

                <Button type="submit" disabled={loading}
                  className="w-full h-11 font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2 mt-1">
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><ChevronRight className="w-4 h-4" /> Créer mon compte</>
                  }
                </Button>
              </form>
            )}

            {/* ── MOT DE PASSE OUBLIÉ ── */}
            {mode === "forgot" && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-3">
                    <HelpCircle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h2 className="font-black text-lg text-gray-900 dark:text-white">Mot de passe oublié ?</h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    Contactez notre service client pour réinitialiser votre mot de passe.
                  </p>
                </div>

                
                  href="https://wa.me/22951762341?text=Bonjour, j'ai oublié mon mot de passe Nexora et j'ai besoin d'aide pour le réinitialiser."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full p-4 rounded-2xl font-bold text-white transition-all hover:opacity-90 active:scale-95"
                  style={{ background: "#25D366" }}
                >
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-black">WhatsApp Support</div>
                    <div className="text-xs text-white/80">+229 51 76 23 41</div>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-60" />
                </a>

                
                  href="mailto:erickpakpo786@gmail.com?subject=Réinitialisation mot de passe Nexora&body=Bonjour, j'ai oublié mon mot de passe. Mon username/email : "
                  className="flex items-center gap-3 w-full p-4 rounded-2xl font-bold bg-blue-600 text-white transition-all hover:bg-blue-700 active:scale-95"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-black">Email Support</div>
                    <div className="text-xs text-white/80">erickpakpo786@gmail.com</div>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-60" />
                </a>

                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  Précisez votre <strong>username</strong> ou <strong>email</strong> ainsi que votre nom complet.
                </p>

                <button onClick={() => setMode("login")}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
                  ← Retour à la connexion
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-blue-300/50 mt-4">
          NEXORA © {new Date().getFullYear()} — Plateforme sécurisée
        </p>
      </div>
    </div>
  );
}
