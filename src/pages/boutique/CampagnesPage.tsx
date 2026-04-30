import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { buildCampagneLink } from "@/lib/slugUtils";
import { getNexoraUser } from "@/lib/nexora-auth";
import { initTheme } from "@/lib/theme";
import {
  Plus, Megaphone, Eye, ShoppingBag, TrendingUp, DollarSign,
  Copy, BarChart2, Trash2, MoreVertical,
  CheckCircle, Loader2, X, ChevronLeft, ArrowLeft, Home
} from "lucide-react";


const db = /** @type {any} */ (supabase);

// ─── SVG Logos réseaux sociaux ────────────────────────────────────────────────
const FacebookLogo = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
    <rect width="24" height="24" rx="6" fill="#1877F2"/>
    <path d="M16.5 3H14C11.79 3 10 4.79 10 7v2H8v3h2v7h3v-7h2.5l.5-3H13V7a1 1 0 011-1h2.5V3z" fill="white"/>
  </svg>
);
const InstagramLogo = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
    <defs>
      <radialGradient id="ig1" cx="30%" cy="107%" r="150%">
        <stop offset="0%" stopColor="#fdf497"/>
        <stop offset="45%" stopColor="#fd5949"/>
        <stop offset="60%" stopColor="#d6249f"/>
        <stop offset="90%" stopColor="#285AEB"/>
      </radialGradient>
    </defs>
    <rect width="24" height="24" rx="6" fill="url(#ig1)"/>
    <rect x="3" y="3" width="18" height="18" rx="5" stroke="white" strokeWidth="1.5" fill="none"/>
    <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.5" fill="none"/>
    <circle cx="17.5" cy="6.5" r="1.2" fill="white"/>
  </svg>
);
const WhatsAppLogo = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
    <rect width="24" height="24" rx="6" fill="#25D366"/>
    <path d="M12 4.5C7.86 4.5 4.5 7.86 4.5 12c0 1.32.35 2.56.96 3.63L4.5 19.5l3.98-.93A7.43 7.43 0 0012 19.5c4.14 0 7.5-3.36 7.5-7.5S16.14 4.5 12 4.5zm4.08 10.35c-.17.48-1 .93-1.38.99-.35.05-.79.08-1.27-.08-.29-.1-.67-.23-1.15-.45-2.01-.87-3.32-2.9-3.42-3.03-.1-.13-.8-1.07-.8-2.04 0-.97.51-1.44.69-1.64.18-.2.39-.25.52-.25h.38c.12 0 .29-.04.45.35l.58 1.44c.05.12.08.25.02.38-.07.13-.1.21-.2.32l-.3.35c-.1.1-.2.21-.09.4.11.19.5.82 1.07 1.33.73.65 1.35.85 1.54.95.19.1.3.08.41-.05l.5-.6c.12-.14.23-.1.38-.05l1.22.58c.14.07.24.1.27.17.04.07.04.41-.13.89z" fill="white"/>
  </svg>
);
const TikTokLogo = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
    <rect width="24" height="24" rx="6" fill="#010101"/>
    <path d="M16.8 5.5c.3 1.1 1.1 2 2.2 2.4v2.1c-.8-.03-1.55-.22-2.2-.56v5A4.3 4.3 0 1112.5 10h.01v2.1a2.18 2.18 0 100 4.36 2.18 2.18 0 002.17-2.3V5.5h2.12z" fill="white"/>
  </svg>
);
const GoogleAdsLogo = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
    <rect width="24" height="24" rx="6" fill="white" stroke="#E5E7EB" strokeWidth="1"/>
    <text x="12" y="16" textAnchor="middle" fontSize="14" fontWeight="800" fontFamily="Arial, sans-serif" fill="#4285F4">G</text>
  </svg>
);
const SMSEmailLogo = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
    <rect width="24" height="24" rx="6" fill="#6366F1"/>
    <rect x="4" y="7.5" width="16" height="10" rx="2" stroke="white" strokeWidth="1.5" fill="none"/>
    <path d="M4 9.5l8 5 8-5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const DirectLinkLogo = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
    <rect width="24" height="24" rx="6" fill="#64748B"/>
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
  </svg>
);

const SOURCES = [
  { id: "facebook",  label: "Facebook Ads", Logo: FacebookLogo,   bg: "#EBF5FF", accent: "#1877F2" },
  { id: "instagram", label: "Instagram",    Logo: InstagramLogo,  bg: "#FFF0F8", accent: "#d6249f" },
  { id: "whatsapp",  label: "WhatsApp",     Logo: WhatsAppLogo,   bg: "#EDFAF1", accent: "#25D366" },
  { id: "tiktok",    label: "TikTok",       Logo: TikTokLogo,     bg: "#F0F0F0", accent: "#555"    },
  { id: "sms",       label: "SMS / Email",  Logo: SMSEmailLogo,   bg: "#EEEFFE", accent: "#6366F1" },
  { id: "google",    label: "Google Ads",   Logo: GoogleAdsLogo,  bg: "#FFF8ED", accent: "#4285F4" },
  { id: "direct",    label: "Lien direct",  Logo: DirectLinkLogo, bg: "#F1F5F9", accent: "#64748B" },
];

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div style={{
      background: "hsl(var(--card))",
      border: "1px solid hsl(var(--border))",
      borderRadius: 20,
      padding: "18px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 14,
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
    }}>
      <div style={{ width: 42, height: 42, borderRadius: 14, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon style={{ width: 19, height: 19, color }} />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "hsl(var(--foreground))", lineHeight: 1, letterSpacing: "-0.5px" }}>{value}</div>
        <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 5, fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>{label}</div>
      </div>
    </div>
  );
}

// ─── Campagne Card ────────────────────────────────────────────────────────────
function CampagneCard({ campagne, boutique, onDelete, onCopy, onAnalytics }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const source = SOURCES.find(s => s.id === campagne.source) || SOURCES[6];
  const ca = Number(campagne.chiffre_affaire ?? 0);
  const taux = campagne.taux_conversion ?? 0;
  const isActif = campagne.statut === "actif";
  const { Logo } = source;

  const copyLink = () => {
    const produitParam = campagne.produit_slug ?? campagne.produit_id;
    const lien = campagne.lien_campagne || buildCampagneLink(boutique?.slug ?? "", produitParam, campagne.id);
    navigator.clipboard.writeText(lien);
    onCopy?.();
  };

  return (
    <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 22, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.05)" }}>
      <div style={{ height: 4, background: isActif ? `linear-gradient(90deg, ${source.accent}, #7C3AED)` : "hsl(var(--border))" }} />

      <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: source.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Logo />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "hsl(var(--foreground))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {campagne.nom}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, flexShrink: 0,
                background: isActif ? "#ECFDF5" : "hsl(var(--muted))",
                color: isActif ? "#059669" : "hsl(var(--muted-foreground))",
                border: `1px solid ${isActif ? "#A7F3D0" : "hsl(var(--border))"}`,
              }}>
                {isActif ? "● Actif" : "○ Pausé"}
              </span>
            </div>
            {campagne.produit_nom && (
              <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", gap: 4 }}>
                <ShoppingBag style={{ width: 10, height: 10 }} />
                {campagne.produit_nom}
              </div>
            )}
            <div style={{ fontSize: 11, color: source.accent, fontWeight: 600, marginTop: 2 }}>{source.label}</div>
          </div>
        </div>

        <div style={{ position: "relative" as const, flexShrink: 0 }}>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ width: 32, height: 32, borderRadius: 10, background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MoreVertical style={{ width: 14, height: 14, color: "hsl(var(--muted-foreground))" }} />
          </button>
          {menuOpen && (
            <div style={{ position: "absolute" as const, right: 0, top: 38, width: 172, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 16, boxShadow: "0 12px 32px rgba(0,0,0,0.15)", zIndex: 10, overflow: "hidden" }}>
              {[
                { icon: Copy,      label: "Copier le lien", action: () => { copyLink();               setMenuOpen(false); }, color: "hsl(var(--foreground))" },
                { icon: BarChart2, label: "Analytics",      action: () => { onAnalytics(campagne.id); setMenuOpen(false); }, color: "hsl(var(--foreground))" },
                { icon: Trash2,    label: "Supprimer",      action: () => { onDelete(campagne.id);    setMenuOpen(false); }, color: "#EF4444" },
              ].map(item => (
                <button key={item.label} onClick={item.action} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", fontSize: 13, color: item.color, background: "none", border: "none", cursor: "pointer", textAlign: "left" as const }}>
                  <item.icon style={{ width: 13, height: 13 }} />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", background: "hsl(var(--muted))", borderTop: "1px solid hsl(var(--border))", borderBottom: "1px solid hsl(var(--border))" }}>
        {[
          { label: "Visites",  value: campagne.nb_visites ?? 0,     color: "#7C3AED" },
          { label: "Achats",   value: campagne.nb_conversions ?? 0, color: "#059669" },
          { label: "Revenus",  value: `${ca.toLocaleString()}`,     color: "#D97706" },
          { label: "Conv.",    value: `${taux}%`,                   color: "#2563EB" },
        ].map((s, i) => (
          <div key={s.label} style={{ padding: "12px 6px", textAlign: "center" as const, borderRight: i < 3 ? "1px solid hsl(var(--border))" : "none" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: s.color, letterSpacing: "-0.3px" }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", marginTop: 3, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, padding: "12px" }}>
        <button onClick={copyLink} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", fontSize: 12, fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg, #7C3AED, #5B21B6)", color: "#fff", border: "none", borderRadius: 12, boxShadow: "0 2px 8px rgba(124,58,237,0.3)" }}>
          <Copy style={{ width: 12, height: 12 }} /> Copier lien
        </button>
        <button onClick={() => onAnalytics(campagne.id)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", fontSize: 12, fontWeight: 700, cursor: "pointer", background: "hsl(var(--muted))", color: "hsl(var(--foreground))", border: "none", borderRadius: 12 }}>
          <BarChart2 style={{ width: 12, height: 12 }} /> Analytics
        </button>
      </div>
    </div>
  );
}

// ─── CreatePage ───────────────────────────────────────────────────────────────
function CreatePage({ boutiqueId, boutiqueSlug, userId, produits, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [produitId, setProduitId] = useState("");
  const [source, setSource] = useState("");
  const [nom, setNom] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Bloquer le scroll + assurer que le fond opaque couvre tout
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const produitChoisi = produits.find(p => p.id === produitId);
  const sourceChoisie = SOURCES.find(s => s.id === source);
  const goBack = () => { if (step === 1) onClose(); else setStep(s => s - 1); };

  const handleCreate = async () => {
    if (!nom.trim() || !produitId || !source) return;
    setSaving(true); setError("");
    const { data, error: err } = await db.from("campagnes").insert({ boutique_id: boutiqueId, user_id: userId, produit_id: produitId, nom: nom.trim(), source, statut: "actif" }).select().single();
    if (err) { setError(err.message); setSaving(false); return; }
    const lien_campagne = buildCampagneLink(boutiqueSlug, produitId, data.id);
    await db.from("campagnes").update({ lien_campagne }).eq("id", data.id);
    setSaving(false);
    onCreated({ ...data, lien_campagne });
  };

  return (
    // Le fond utilise hsl(var(--background)) = TOUJOURS opaque, en clair ET en sombre
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "hsl(var(--background))",
      zIndex: 9999,
      overflowY: "auto",
      overflowX: "hidden",
      fontFamily: "'Outfit', system-ui, sans-serif",
      isolation: "isolate",
      willChange: "transform",
    }}>
      {/* Header */}
      <div style={{ background: "hsl(var(--card))", borderBottom: "1px solid hsl(var(--border))", padding: "14px 16px", position: "sticky", top: 0, zIndex: 10, boxSizing: "border-box" as const, width: "100%" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={goBack} style={{ width: 38, height: 38, borderRadius: 12, background: "hsl(var(--muted))", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ChevronLeft style={{ width: 18, height: 18, color: "hsl(var(--muted-foreground))" }} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "hsl(var(--foreground))" }}>Nouvelle campagne</div>
            <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 1 }}>Étape {step} / 3</div>
          </div>
          <button onClick={onClose} style={{ width: 38, height: 38, borderRadius: 12, background: "hsl(var(--muted))", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X style={{ width: 14, height: 14, color: "hsl(var(--muted-foreground))" }} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: "hsl(var(--border))" }}>
        <div style={{ height: "100%", background: "linear-gradient(90deg, #7C3AED, #5B21B6)", width: `${(step / 3) * 100}%`, transition: "width 0.35s cubic-bezier(0.4,0,0.2,1)", borderRadius: "0 4px 4px 0" }} />
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 16px 100px" }}>

        {/* Étape 1 — Produit */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "hsl(var(--foreground))", marginBottom: 6, letterSpacing: "-0.4px" }}>Quel produit promouvoir ?</div>
              <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", lineHeight: 1.5 }}>Choisissez le produit à suivre dans cette campagne.</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {produits.length === 0 && (
                <div style={{ textAlign: "center" as const, padding: "40px 24px", color: "hsl(var(--muted-foreground))", fontSize: 13, background: "hsl(var(--card))", borderRadius: 20, border: "1px solid hsl(var(--border))" }}>
                  Aucun produit. Créez d'abord un produit.
                </div>
              )}
              {produits.map(p => {
                const photo = (Array.isArray(p.photos) ? p.photos : [])[0];
                return (
                  <button key={p.id} onClick={() => { setProduitId(p.id); setStep(2); }} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px", background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 18, cursor: "pointer", textAlign: "left" as const, width: "100%", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                    <div style={{ width: 54, height: 54, borderRadius: 14, overflow: "hidden", background: "hsl(var(--muted))", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" as const }} /> : <ShoppingBag style={{ width: 20, height: 20, color: "hsl(var(--muted-foreground))" }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "hsl(var(--foreground))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nom}</div>
                      <div style={{ fontSize: 13, color: "#7C3AED", fontWeight: 700, marginTop: 2 }}>{Number(p.prix).toLocaleString()} XOF</div>
                    </div>
                    <ChevronLeft style={{ width: 16, height: 16, color: "hsl(var(--muted-foreground))", transform: "rotate(180deg)", flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Étape 2 — Source */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "hsl(var(--foreground))", marginBottom: 6, letterSpacing: "-0.4px" }}>Où diffusez-vous ?</div>
              <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", lineHeight: 1.5 }}>La source permet d'identifier l'origine de vos visiteurs.</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {SOURCES.map(s => {
                const { Logo } = s;
                return (
                  <button key={s.id} onClick={() => { setSource(s.id); setStep(3); }} style={{ padding: "20px 12px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 20, cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Logo />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "hsl(var(--foreground))", textAlign: "center" as const, lineHeight: 1.3 }}>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Étape 3 — Nom */}
        {step === 3 && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "hsl(var(--foreground))", marginBottom: 6, letterSpacing: "-0.4px" }}>Nommez votre campagne</div>
              <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", lineHeight: 1.5 }}>Un nom court pour identifier cette campagne.</div>
            </div>

            <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 18, padding: "16px", marginBottom: 22, display: "flex" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", marginBottom: 4, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>Produit</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "hsl(var(--foreground))" }}>{produitChoisi?.nom}</div>
              </div>
              <div style={{ width: 1, background: "hsl(var(--border))", margin: "0 16px" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", marginBottom: 4, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>Source</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "hsl(var(--foreground))" }}>{sourceChoisie?.label}</div>
              </div>
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "hsl(var(--foreground))", display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>Nom *</label>
              <input
                value={nom}
                onChange={e => setNom(e.target.value)}
                placeholder="Ex: Promo Ramadan Basket..."
                autoFocus
                onKeyDown={e => { if (e.key === "Enter" && nom.trim()) handleCreate(); }}
                style={{ width: "100%", boxSizing: "border-box" as const, padding: "14px 16px", fontSize: 14, border: "1.5px solid hsl(var(--border))", borderRadius: 14, background: "hsl(var(--card))", color: "hsl(var(--foreground))", outline: "none", fontFamily: "inherit", transition: "border-color 0.15s" }}
                onFocus={e => { e.target.style.borderColor = "#7C3AED"; }}
                onBlur={e => { e.target.style.borderColor = "hsl(var(--border))"; }}
              />
            </div>

            {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "10px 14px", fontSize: 12, color: "#DC2626", marginBottom: 16 }}>{error}</div>}

            <button
              onClick={handleCreate}
              disabled={!nom.trim() || saving}
              style={{
                width: "100%", padding: "15px", fontSize: 14, fontWeight: 700,
                background: nom.trim() && !saving ? "linear-gradient(135deg, #7C3AED, #5B21B6)" : "hsl(var(--muted))",
                color: nom.trim() && !saving ? "#fff" : "hsl(var(--muted-foreground))",
                border: "none", borderRadius: 16,
                cursor: nom.trim() && !saving ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: nom.trim() && !saving ? "0 4px 16px rgba(124,58,237,0.35)" : "none",
                transition: "all 0.2s",
              }}
            >
              {saving ? <><Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> Création...</> : <><Megaphone style={{ width: 15, height: 15 }} /> Créer la campagne</>}
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function CampagnesPage() {
  const navigate = useNavigate();
  const [campagnes, setCampagnes] = useState([]);
  const [produits, setProduits] = useState([]);
  const [boutique, setBoutique] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [copied, setCopied] = useState(false);

  // Appliquer le thème sauvegardé au montage
  useEffect(() => { initTheme(); fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const user = getNexoraUser();
    if (!user?.id) { setLoading(false); return; }
    const { data: boutiqueData } = await db.from("boutiques").select("*").eq("user_id", user.id).maybeSingle();
    if (!boutiqueData) { setLoading(false); return; }
    setBoutique(boutiqueData);
    const { data: produitsData } = await db.from("produits").select("id, nom, prix, photos").eq("boutique_id", boutiqueData.id).eq("actif", true).order("created_at", { ascending: false });
    setProduits(produitsData || []);
    const { data: campagnesData } = await db.from("campagnes_stats").select("*").eq("boutique_id", boutiqueData.id).order("created_at", { ascending: false });
    setCampagnes(campagnesData || []);
    setLoading(false);
  };

  const deleteCampagne = async (id) => { await db.from("campagnes").delete().eq("id", id); setCampagnes(c => c.filter(x => x.id !== id)); };
  const handleCopy = () => { setCopied(true); setTimeout(() => setCopied(false), 2200); };

  const totalVisites = campagnes.reduce((s, c) => s + (c.nb_visites ?? 0), 0);
  const totalAchats  = campagnes.reduce((s, c) => s + (c.nb_conversions ?? 0), 0);
  const totalCA      = campagnes.reduce((s, c) => s + Number(c.chiffre_affaire ?? 0), 0);
  const totalActives = campagnes.filter(c => c.statut === "actif").length;
  const user = getNexoraUser();

  return (
    <>
      {/* Fond hsl(var(--background)) = opaque en clair ET en sombre */}
      <div style={{ minHeight: "100vh", background: "hsl(var(--background))", fontFamily: "'Outfit', system-ui, sans-serif" }}>

        {/* Header */}
        <div style={{ background: "hsl(var(--card))", borderBottom: "1px solid hsl(var(--border))", padding: "14px 16px", position: "sticky", top: 0, zIndex: 20 }}>
          <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => navigate("/boutique")} style={{ width: 38, height: 38, borderRadius: 12, background: "hsl(var(--muted))", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ArrowLeft style={{ width: 16, height: 16, color: "hsl(var(--muted-foreground))" }} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, background: "linear-gradient(135deg, #7C3AED, #5B21B6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Megaphone style={{ width: 14, height: 14, color: "#fff" }} />
                </div>
                <span style={{ fontSize: 17, fontWeight: 800, color: "hsl(var(--foreground))", letterSpacing: "-0.3px" }}>Campagnes</span>
                {campagnes.length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 99, background: "#EDE9FE", color: "#7C3AED" }}>{campagnes.length}</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 1, paddingLeft: 38, fontWeight: 500 }}>Suivi publicitaire de votre boutique</div>
            </div>
            <button onClick={() => setShowCreate(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "linear-gradient(135deg, #7C3AED, #5B21B6)", color: "#fff", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0, boxShadow: "0 2px 10px rgba(124,58,237,0.35)" }}>
              <Plus style={{ width: 14, height: 14 }} /> Créer
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 560, margin: "0 auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <StatCard icon={Eye}         label="Visites totales"   value={totalVisites.toLocaleString()} color="#7C3AED" bg="#EDE9FE" />
            <StatCard icon={ShoppingBag} label="Achats réalisés"   value={totalAchats.toLocaleString()}  color="#059669" bg="#ECFDF5" />
            <StatCard icon={DollarSign}  label="Revenus (XOF)"     value={totalCA.toLocaleString()}      color="#D97706" bg="#FFFBEB" />
            <StatCard icon={TrendingUp}  label="Campagnes actives" value={totalActives}                  color="#2563EB" bg="#EFF6FF" />
          </div>

          {/* Toast */}
          {copied && (
            <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 14, padding: "12px 16px", fontSize: 13, color: "#059669", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle style={{ width: 15, height: 15 }} /> Lien copié dans le presse-papier !
            </div>
          )}

          {loading && (
            <div style={{ display: "flex", justifyContent: "center", padding: "56px 0" }}>
              <Loader2 style={{ width: 28, height: 28, color: "#7C3AED", animation: "spin 1s linear infinite" }} />
            </div>
          )}

          {!loading && campagnes.length === 0 && (
            <div style={{ textAlign: "center" as const, padding: "60px 24px", background: "hsl(var(--card))", borderRadius: 24, border: "1px solid hsl(var(--border))", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #EDE9FE, #DDD6FE)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <Megaphone style={{ width: 28, height: 28, color: "#7C3AED" }} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "hsl(var(--foreground))", marginBottom: 8, letterSpacing: "-0.3px" }}>Aucune campagne</div>
              <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", marginBottom: 28, lineHeight: 1.7 }}>Créez votre première campagne et suivez vos ventes en temps réel.</div>
              <button onClick={() => setShowCreate(true)} style={{ padding: "12px 28px", background: "linear-gradient(135deg, #7C3AED, #5B21B6)", color: "#fff", border: "none", borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 4px 16px rgba(124,58,237,0.35)" }}>
                <Plus style={{ width: 14, height: 14 }} /> Créer une campagne
              </button>
            </div>
          )}

          {!loading && campagnes.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {campagnes.map(c => (
                <CampagneCard key={c.id} campagne={c} boutique={boutique} onDelete={deleteCampagne} onCopy={handleCopy} onAnalytics={(id) => navigate(`/boutique/campagnes/${id}/analytics`)} />
              ))}
            </div>
          )}

          {!loading && (
            <button onClick={() => navigate("/boutique")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px", width: "100%", background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))", borderRadius: 16, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <Home style={{ width: 14, height: 14 }} /> Retour au dashboard boutique
            </button>
          )}

          <div style={{ height: 16 }} />
        </div>
      </div>

      {showCreate && (
        <CreatePage boutiqueId={boutique?.id} boutiqueSlug={boutique?.slug} userId={user?.id} produits={produits} onClose={() => setShowCreate(false)}
          onCreated={(newCampagne) => {
            setCampagnes(prev => [{ ...newCampagne, nb_visites: 0, nb_conversions: 0, chiffre_affaire: 0, taux_conversion: 0 }, ...prev]);
            setShowCreate(false);
          }}
        />
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
