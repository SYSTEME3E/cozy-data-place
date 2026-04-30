import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, FileText, Shield, Cookie, BookOpen, Building2 } from "lucide-react";

const LOGO = "https://i.postimg.cc/c1QgbZsG/ei_1773937801458_removebg_preview.png";

const LEGAL_PAGES = [
  { path: "/cgu",             label: "CGU",               icon: FileText,  color: "#6366f1" },
  { path: "/cgv",             label: "CGV",               icon: BookOpen,  color: "#10b981" },
  { path: "/confidentialite", label: "Confidentialité",   icon: Shield,    color: "#3b82f6" },
  { path: "/cookies",         label: "Cookies",           icon: Cookie,    color: "#f59e0b" },
  { path: "/mentions-legales",label: "Mentions légales",  icon: Building2, color: "#8b5cf6" },
];

interface LegalLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  updatedAt?: string;
}

export default function LegalLayout({
  children,
  title,
  subtitle,
  icon: Icon,
  iconColor,
  updatedAt = "28 avril 2026",
}: LegalLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      className="min-h-screen bg-white text-gray-900"
      style={{
        fontFamily: "'Source Sans 3', 'Source Sans Pro', sans-serif",
        overflowX: "hidden",
        width: "100%",
        maxWidth: "100vw",
        boxSizing: "border-box",
        margin: 0,
        padding: 0,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800;900&family=Source+Sans+3:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        html, body, #root {
          overflow-x: hidden;
          width: 100%;
          max-width: 100vw;
          margin: 0 !important;
          padding: 0 !important;
        }

        .legal-body    { font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif; }

        .legal-prose h3 {
          font-family: 'Source Sans 3', sans-serif;
          font-weight: 700;
          font-size: 0.95rem;
          color: #111827;
          margin-bottom: 0.35rem;
          letter-spacing: 0.01em;
        }
        .legal-prose p {
          font-family: 'Source Sans 3', sans-serif;
          font-size: 0.9375rem;
          color: #374151;
          line-height: 1.75;
        }

        .legal-section-num {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 3.5rem;
          font-weight: 900;
          color: #e5e7eb;
          line-height: 1;
          user-select: none;
          -webkit-font-smoothing: antialiased;
        }
        .legal-section-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.375rem;
          font-weight: 800;
          color: #111827;
          -webkit-font-smoothing: antialiased;
        }
        .legal-main-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-weight: 900;
          line-height: 1.15;
          -webkit-font-smoothing: antialiased;
        }
        .legal-nav-btn {
          font-family: 'Source Sans 3', sans-serif;
          font-weight: 700;
          font-size: 0.75rem;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }
      `}</style>

      {/* ── HEADER ── */}
      <div className="bg-gray-950 text-white" style={{ width: "100%" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "2.5rem 1.25rem 3rem", width: "100%" }}>

          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
            style={{ fontSize: "0.875rem", fontWeight: 600, fontFamily: "'Source Sans 3', sans-serif" }}
          >
            <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
          </button>

          <div className="flex flex-wrap gap-2 mb-10">
            {LEGAL_PAGES.map((p) => {
              const PageIcon = p.icon;
              const active = location.pathname === p.path;
              return (
                <button
                  key={p.path}
                  onClick={() => navigate(p.path)}
                  className={`legal-nav-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                    active
                      ? "bg-white text-gray-900"
                      : "bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white"
                  }`}
                >
                  <PageIcon className="w-3.5 h-3.5" />
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: iconColor + "25" }}
            >
              <Icon className="w-7 h-7" style={{ color: iconColor }} />
            </div>
            <div>
              <p
                style={{ color: iconColor, fontFamily: "'Source Sans 3', sans-serif", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.25rem" }}
              >
                Légal · NEXORA
              </p>
              <h1 className="legal-main-title text-white" style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)" }}>{title}</h1>
              <p style={{ color: "#9ca3af", fontSize: "0.875rem", fontFamily: "'Source Sans 3', sans-serif", marginTop: "0.25rem" }}>
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-6 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <img src={LOGO} alt="NEXORA" className="w-7 h-7 object-contain" />
            <div style={{ fontSize: "0.75rem", color: "#6b7280", fontFamily: "'Source Sans 3', sans-serif" }}>
              <span style={{ color: "#d1d5db", fontWeight: 600 }}>NEXORA</span> · Dernière mise à jour : {updatedAt}
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div
        className="legal-body legal-prose"
        style={{ maxWidth: "960px", margin: "0 auto", padding: "3.5rem 1.25rem", width: "100%" }}
      >
        {children}
      </div>

      {/* ── FOOTER ── */}
      <div className="bg-gray-950 py-10 text-center" style={{ width: "100%" }}>
        <img src={LOGO} alt="NEXORA" className="w-9 h-9 object-contain mx-auto mb-3" />
        <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 900, color: "white", fontSize: "1rem", marginBottom: "0.25rem" }}>
          NEXORA
        </p>
        <p style={{ color: "#6b7280", fontSize: "0.875rem", fontFamily: "'Source Sans 3', sans-serif" }}>
          © {new Date().getFullYear()} NEXORA SAS. Tous droits réservés.
        </p>
        <p style={{ color: "#4b5563", fontSize: "0.75rem", marginTop: "0.5rem", fontFamily: "'Source Sans 3', sans-serif" }}>
          Contact :{" "}
          <a href="mailto:support@nexora.africa" style={{ color: "#6b7280" }} className="hover:text-white transition-colors">
            support@nexora.africa
          </a>
        </p>
        <div className="flex justify-center gap-4 mt-4 flex-wrap">
          {LEGAL_PAGES.map((p) => (
            <button
              key={p.path}
              onClick={() => (window.location.href = p.path)}
              style={{ fontSize: "0.75rem", color: "#4b5563", fontFamily: "'Source Sans 3', sans-serif", fontWeight: 600 }}
              className="hover:text-white transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
