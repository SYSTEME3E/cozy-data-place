import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { initTheme } from "@/lib/theme";
import {
  ArrowLeft, Eye, ShoppingBag, DollarSign, TrendingUp,
  Globe, Smartphone, Monitor, Download, Users, RefreshCw
} from "lucide-react";

const db = /** @type {any} */ (supabase);

// ─── Logos SVG réseaux sociaux (identiques à CampagnesPage) ──────────────────
const FacebookLogo = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <rect width="24" height="24" rx="6" fill="#1877F2"/>
    <path d="M16.5 3H14C11.79 3 10 4.79 10 7v2H8v3h2v7h3v-7h2.5l.5-3H13V7a1 1 0 011-1h2.5V3z" fill="white"/>
  </svg>
);
const InstagramLogo = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <defs>
      <radialGradient id="ig2" cx="30%" cy="107%" r="150%">
        <stop offset="0%" stopColor="#fdf497"/>
        <stop offset="45%" stopColor="#fd5949"/>
        <stop offset="60%" stopColor="#d6249f"/>
        <stop offset="90%" stopColor="#285AEB"/>
      </radialGradient>
    </defs>
    <rect width="24" height="24" rx="6" fill="url(#ig2)"/>
    <rect x="3" y="3" width="18" height="18" rx="5" stroke="white" strokeWidth="1.5" fill="none"/>
    <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.5" fill="none"/>
    <circle cx="17.5" cy="6.5" r="1.2" fill="white"/>
  </svg>
);
const WhatsAppLogo = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <rect width="24" height="24" rx="6" fill="#25D366"/>
    <path d="M12 4.5C7.86 4.5 4.5 7.86 4.5 12c0 1.32.35 2.56.96 3.63L4.5 19.5l3.98-.93A7.43 7.43 0 0012 19.5c4.14 0 7.5-3.36 7.5-7.5S16.14 4.5 12 4.5zm4.08 10.35c-.17.48-1 .93-1.38.99-.35.05-.79.08-1.27-.08-.29-.1-.67-.23-1.15-.45-2.01-.87-3.32-2.9-3.42-3.03-.1-.13-.8-1.07-.8-2.04 0-.97.51-1.44.69-1.64.18-.2.39-.25.52-.25h.38c.12 0 .29-.04.45.35l.58 1.44c.05.12.08.25.02.38-.07.13-.1.21-.2.32l-.3.35c-.1.1-.2.21-.09.4.11.19.5.82 1.07 1.33.73.65 1.35.85 1.54.95.19.1.3.08.41-.05l.5-.6c.12-.14.23-.1.38-.05l1.22.58c.14.07.24.1.27.17.04.07.04.41-.13.89z" fill="white"/>
  </svg>
);
const TikTokLogo = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <rect width="24" height="24" rx="6" fill="#010101"/>
    <path d="M16.8 5.5c.3 1.1 1.1 2 2.2 2.4v2.1c-.8-.03-1.55-.22-2.2-.56v5A4.3 4.3 0 1112.5 10h.01v2.1a2.18 2.18 0 100 4.36 2.18 2.18 0 002.17-2.3V5.5h2.12z" fill="white"/>
  </svg>
);
const GoogleAdsLogo = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <rect width="24" height="24" rx="6" fill="white" stroke="#E5E7EB" strokeWidth="1"/>
    <text x="12" y="16" textAnchor="middle" fontSize="14" fontWeight="800" fontFamily="Arial" fill="#4285F4">G</text>
  </svg>
);
const SMSEmailLogo = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <rect width="24" height="24" rx="6" fill="#6366F1"/>
    <rect x="4" y="7.5" width="16" height="10" rx="2" stroke="white" strokeWidth="1.5" fill="none"/>
    <path d="M4 9.5l8 5 8-5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const DirectLinkLogo = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <rect width="24" height="24" rx="6" fill="#64748B"/>
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
  </svg>
);

const SOURCES_INFO = {
  facebook:  { label: "Facebook Ads", Logo: FacebookLogo,   accent: "#1877F2" },
  instagram: { label: "Instagram",    Logo: InstagramLogo,  accent: "#d6249f" },
  whatsapp:  { label: "WhatsApp",     Logo: WhatsAppLogo,   accent: "#25D366" },
  tiktok:    { label: "TikTok",       Logo: TikTokLogo,     accent: "#010101" },
  sms:       { label: "SMS / Email",  Logo: SMSEmailLogo,   accent: "#6366F1" },
  google:    { label: "Google Ads",   Logo: GoogleAdsLogo,  accent: "#4285F4" },
  direct:    { label: "Lien direct",  Logo: DirectLinkLogo, accent: "#64748B" },
};

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, color, bg }) {
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
      <div style={{
        width: 42, height: 42, borderRadius: 14,
        background: bg,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon style={{ width: 19, height: 19, color }} />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "hsl(var(--foreground))", lineHeight: 1, letterSpacing: "-0.5px" }}>{value}</div>
        <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 5, fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>{label}</div>
      </div>
    </div>
  );
}

export default function CampagneAnalyticsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campagne, setCampagne] = useState(null);
  const [visites, setVisites] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7j");

  // Appliquer le thème sauvegardé (dark / light)
  useEffect(() => { initTheme(); }, []);
  useEffect(() => { if (id) fetchData(); }, [id]);

  const fetchData = async () => {
    setLoading(true);
    const { data: c } = await db.from("campagnes_stats").select("*").eq("id", id).maybeSingle();
    if (c) setCampagne(c);
    const { data: v } = await db.from("campagne_visites").select("*").eq("campagne_id", id).order("created_at", { ascending: false }).limit(200);
    setVisites(v || []);
    const { data: cv } = await db.from("campagne_conversions").select("*").eq("campagne_id", id).order("created_at", { ascending: false }).limit(50);
    setConversions(cv || []);
    setLoading(false);
  };

  const paysByCount = visites.reduce((acc, v) => { const k = v.pays || "Inconnu"; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
  const paysTop = Object.entries(paysByCount).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 5);
  const totalVisites = visites.length;

  const devicesByCount = visites.reduce((acc, v) => { const k = v.appareil || "mobile"; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
  const deviceColors = { mobile: "#7C3AED", desktop: "#2563EB", tablette: "#D97706" };

  const now = new Date();
  const days7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });
  const visitesParJour = days7.map(day => ({
    day: day.slice(5).replace("-", "/"),
    count: visites.filter(v => v.created_at?.startsWith(day)).length,
  }));
  const maxV = Math.max(...visitesParJour.map(d => d.count), 1);

  const sourceInfo = campagne ? (SOURCES_INFO[campagne.source] || SOURCES_INFO["direct"]) : SOURCES_INFO["direct"];
  const { Logo } = sourceInfo;
  const taux = campagne?.taux_conversion ?? 0;
  const ca = Number(campagne?.chiffre_affaire ?? 0);

  const exportCSV = () => {
    const rows = [["Date", "Client", "Téléphone", "Montant"], ...conversions.map(c => [new Date(c.created_at).toLocaleDateString("fr-FR"), c.client_nom || "—", c.client_tel || "—", `${c.montant} ${c.devise}`])];
    const csv = rows.map(r => r.join(";")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv); a.download = `campagne-${id}-achats.csv`; a.click();
  };

  return (
    // Fond hsl(var(--background)) = totalement opaque en clair ET en sombre
    <div style={{ minHeight: "100vh", background: "hsl(var(--background))", fontFamily: "'Outfit', system-ui, sans-serif" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: "hsl(var(--card))",
        borderBottom: "1px solid hsl(var(--border))",
        padding: "14px 16px",
        position: "sticky", top: 0, zIndex: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 520, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => navigate(-1)} style={{
              width: 38, height: 38, borderRadius: 12,
              background: "hsl(var(--muted))",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <ArrowLeft style={{ width: 16, height: 16, color: "hsl(var(--muted-foreground))" }} />
            </button>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Logo />
                </div>
                <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "hsl(var(--foreground))", letterSpacing: "-0.2px" }}>
                  {campagne?.nom || "Analytics"}
                </h1>
              </div>
              <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", margin: "2px 0 0 24px", fontWeight: 500 }}>
                {sourceInfo.label}{campagne?.produit_nom ? ` · ${campagne.produit_nom}` : ""}
              </p>
            </div>
          </div>
          <button onClick={fetchData} style={{
            width: 38, height: 38, borderRadius: 12,
            background: "hsl(var(--muted))",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <RefreshCw style={{ width: 14, height: 14, color: "hsl(var(--muted-foreground))" }} />
          </button>
        </div>

        {/* Périodes */}
        <div style={{ display: "flex", gap: 6, maxWidth: 520, margin: "10px auto 0" }}>
          {["7j", "30j", "90j", "Tout"].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: "6px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: period === p ? "#7C3AED" : "hsl(var(--muted))",
              color: period === p ? "#fff" : "hsl(var(--muted-foreground))",
              border: "none",
              boxShadow: period === p ? "0 2px 8px rgba(124,58,237,0.3)" : "none",
            }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          <MetricCard icon={Eye}         label="Visites"      value={(campagne?.nb_visites ?? 0).toLocaleString()} color="#7C3AED" bg="#EDE9FE" />
          <MetricCard icon={ShoppingBag} label="Achats"       value={campagne?.nb_conversions ?? 0}               color="#059669" bg="#ECFDF5" />
          <MetricCard icon={DollarSign}  label="Revenus"      value={`${ca.toLocaleString()} XOF`}                color="#D97706" bg="#FFFBEB" />
          <MetricCard icon={TrendingUp}  label="Taux de conv." value={`${taux}%`}                                 color="#2563EB" bg="#EFF6FF" />
        </div>

        {/* Graphique visites 7j */}
        <div style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: 20, padding: "18px 16px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "hsl(var(--foreground))", margin: "0 0 18px", letterSpacing: "-0.2px" }}>
            Visites — 7 derniers jours
          </h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100 }}>
            {visitesParJour.map((d, i) => {
              const pct = Math.round((d.count / maxV) * 100);
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>{d.count > 0 ? d.count : ""}</div>
                  <div style={{ width: "100%", display: "flex", alignItems: "flex-end", height: 72 }}>
                    <div style={{
                      width: "100%",
                      background: d.count > 0 ? "#7C3AED" : "hsl(var(--muted))",
                      borderRadius: "4px 4px 0 0",
                      height: `${pct || 4}%`,
                      transition: "height 0.3s ease",
                    }} />
                  </div>
                  <span style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", fontWeight: 500 }}>{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pays */}
        {paysTop.length > 0 && (
          <div style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 20, padding: "18px 16px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "hsl(var(--foreground))", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 6, letterSpacing: "-0.2px" }}>
              <Globe style={{ width: 15, height: 15, color: "#7C3AED" }} /> Visites par pays
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {paysTop.map(([pays, count]) => {
                const pct = totalVisites > 0 ? Math.round((count as number / totalVisites) * 100) : 0;
                return (
                  <div key={pays}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: "hsl(var(--foreground))", fontWeight: 500 }}>{pays}</span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>{count as number}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED", width: 34, textAlign: "right" as const }}>{pct}%</span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: "hsl(var(--muted))", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "linear-gradient(90deg, #7C3AED, #5B21B6)", borderRadius: 99, width: `${pct}%`, transition: "width 0.4s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Appareils */}
        {Object.keys(devicesByCount).length > 0 && (
          <div style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 20, padding: "18px 16px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "hsl(var(--foreground))", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 6, letterSpacing: "-0.2px" }}>
              <Smartphone style={{ width: 15, height: 15, color: "#7C3AED" }} /> Appareils
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {Object.entries(devicesByCount).map(([device, count]) => {
                const pct = totalVisites > 0 ? Math.round((Number(count) / totalVisites) * 100) : 0;
                const color = deviceColors[device] || "#888";
                const Icon = device === "desktop" ? Monitor : Smartphone;
                return (
                  <div key={device} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon style={{ width: 15, height: 15, color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 13, color: "hsl(var(--foreground))", textTransform: "capitalize" as const, fontWeight: 500 }}>{device}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color }}>{pct}%</span>
                      </div>
                      <div style={{ height: 6, background: "hsl(var(--muted))", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", background: color, borderRadius: 99, width: `${pct}%`, transition: "width 0.4s ease" }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {devicesByCount["mobile"] && (
              <div style={{ marginTop: 14, background: "#7C3AED10", border: "1px solid #7C3AED25", borderRadius: 12, padding: "10px 14px" }}>
                <p style={{ fontSize: 12, color: "#7C3AED", margin: 0, fontWeight: 500 }}>
                  📱 {Math.round((devicesByCount["mobile"] / totalVisites) * 100)}% de vos visiteurs sont sur mobile — optimisez votre page en priorité.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Derniers achats */}
        <div style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: 20, padding: "18px 16px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "hsl(var(--foreground))", margin: 0, display: "flex", alignItems: "center", gap: 6, letterSpacing: "-0.2px" }}>
              <Users style={{ width: 15, height: 15, color: "#7C3AED" }} /> Derniers achats
            </h3>
            {conversions.length > 0 && (
              <button onClick={exportCSV} style={{ fontSize: 11, color: "#7C3AED", background: "none", border: "none", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                <Download style={{ width: 11, height: 11 }} /> Export CSV
              </button>
            )}
          </div>

          {conversions.length === 0 ? (
            <div style={{ textAlign: "center" as const, padding: "28px 0", color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
              Aucun achat enregistré pour cette campagne encore.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {conversions.map((cv) => (
                <div key={cv.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "#7C3AED18", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, color: "#7C3AED", flexShrink: 0,
                  }}>
                    {(cv.client_nom || "?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {cv.client_nom || "Client anonyme"}
                    </div>
                    <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                      {cv.client_tel || "—"} · {new Date(cv.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", flexShrink: 0 }}>
                    +{Number(cv.montant).toLocaleString()} XOF
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}
