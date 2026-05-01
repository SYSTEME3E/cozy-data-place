import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Package, ShoppingBag, Settings,
  Eye, ChevronRight, Menu, X, ArrowLeft, Store, Sun, Moon, BarChart3, Zap, Users, Wallet, Megaphone, Receipt, Leaf, TrendingUp, MessageCircle
} from "lucide-react";
import { initTheme, toggleTheme, getTheme } from "@/lib/theme";

// ⚠️ "Finances & Retraits" retiré du menu utilisateur (désactivé côté vendeur)
const boutiqueNav = [
  { path: "/boutique",              icon: LayoutDashboard, label: "Dashboard",    color: "text-[#305CDE]",  bg: "bg-[#305CDE]/10"  },
  { path: "/boutique/performance",  icon: BarChart3,       label: "Performance",  color: "text-indigo-400", bg: "bg-indigo-400/10" },
  { path: "/boutique/produits",     icon: Package,         label: "Produits",     color: "text-purple-400", bg: "bg-purple-400/10" },
  { path: "/boutique/digitaux",         icon: Zap,         label: "Digitaux",         color: "text-indigo-400", bg: "bg-indigo-400/10" },
  { path: "/boutique/ventes-digitales", icon: TrendingUp,  label: "Ventes Digitales", color: "text-purple-400", bg: "bg-purple-400/10" },
  { path: "/boutique/factures",     icon: Receipt,         label: "Factures",     color: "text-purple-400", bg: "bg-purple-300/10" },
  { path: "/boutique/portefeuille", icon: Wallet,          label: "Portefeuille", color: "text-violet-400", bg: "bg-violet-400/10" },
  { path: "/boutique/commandes",    icon: ShoppingBag,     label: "Commandes",    color: "text-orange-400", bg: "bg-orange-400/10" },
  { path: "/boutique/clients",      icon: Users,           label: "Mes Clients",  color: "text-[#305CDE]",   bg: "bg-[#305CDE]/10"   },
  { path: "/boutique/messages-vendeur", icon: MessageCircle, label: "Messages",   color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { path: "/boutique/campagnes",    icon: Megaphone,       label: "Campagnes",    color: "text-rose-400",   bg: "bg-rose-400/10"   },
  { path: "/boutique/bien-etre-yupi", icon: Leaf,          label: "BIEN-ÊTRE YUPI", color: "text-[#008000]", bg: "bg-[#008000]/10"  },
  { path: "/boutique/parametres",   icon: Settings,        label: "Paramètres",   color: "text-gray-400",   bg: "bg-gray-400/10"   },
];


// Pages affichées dans la barre de navigation en bas (mobile uniquement)
const bottomNavItems = [
  { path: "/boutique",             icon: LayoutDashboard, label: "Accueil",   color: "text-[#305CDE]"  },
  { path: "/boutique/produits",    icon: Package,         label: "Produits",  color: "text-purple-500" },
  { path: "/boutique/performance", icon: BarChart3,       label: "Stats",     color: "text-indigo-500" },
  { path: "/boutique/commandes",   icon: ShoppingBag,     label: "Commandes", color: "text-orange-500" },
  { path: "/boutique/clients",     icon: Users,           label: "Clients",   color: "text-[#305CDE]"   },
];

interface BoutiqueLayoutProps {
  children: React.ReactNode;
  boutiqueName?: string;
  boutiqueSlug?: string;
}

export default function BoutiqueLayout({ children, boutiqueName = "Ma Boutique", boutiqueSlug }: BoutiqueLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    initTheme();
    setDarkMode(getTheme() === "dark");
  }, []);

  const handleToggleTheme = () => {
    const next = toggleTheme();
    setDarkMode(next === "dark");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex overflow-x-hidden">

      {/* Overlay mobile */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed top-0 left-0 h-full z-30
        bg-white dark:bg-gray-900
        border-r border-gray-200 dark:border-gray-800
        shadow-sm flex flex-col transition-all duration-300
        ${sidebarOpen ? "w-56" : "w-[68px]"}
        ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>

        {/* Logo */}
        <div className={`flex items-center gap-2.5 px-3 py-3.5 border-b border-gray-100 dark:border-gray-800 ${!sidebarOpen ? "justify-center" : ""}`}>
          <div className="w-8 h-8 rounded-full bg-[#305CDE] flex items-center justify-center flex-shrink-0">
            <Store className="w-4 h-4 text-white" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0 flex-1">
              <p className="font-black text-sm text-gray-800 dark:text-gray-100 truncate">{boutiqueName}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Espace vendeur</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`hidden lg:flex w-6 h-6 items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0 ${!sidebarOpen ? "ml-0 mt-1" : "ml-auto"}`}
          >
            <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${sidebarOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Bouton Retour */}
        <button
          onClick={() => navigate("/dashboard")}
          title="Retour au tableau de bord"
          className={`flex items-center gap-2.5 border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200 transition-colors ${sidebarOpen ? "px-3 py-2.5" : "px-0 py-2.5 justify-center"}`}
        >
          <div className={`flex items-center justify-center rounded-lg flex-shrink-0 bg-gray-100 dark:bg-gray-800 ${sidebarOpen ? "w-7 h-7" : "w-9 h-9"}`}>
            <ArrowLeft className={`text-gray-500 dark:text-gray-400 flex-shrink-0 ${sidebarOpen ? "w-4 h-4" : "w-5 h-5"}`} />
          </div>
          {sidebarOpen && <span className="text-sm font-medium">Retour</span>}
        </button>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {boutiqueNav.map(({ path, icon: Icon, label, color, bg }) => {
            const active = location.pathname === path;
            const isBottomNavItem = bottomNavItems.some(item => item.path === path);
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileSidebarOpen(false)}
                title={!sidebarOpen ? label : undefined}
                className={`
                  ${isBottomNavItem ? "hidden lg:flex" : "flex"} items-center gap-3 rounded-xl transition-all duration-150
                  ${sidebarOpen ? "px-2.5 py-2" : "px-0 py-2 justify-center"}
                  ${active
                    ? "bg-[#305CDE]/10 dark:bg-[#305CDE]/20 text-[#305CDE] font-semibold"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200"
                  }
                `}
              >
                <div className={`
                  flex items-center justify-center rounded-lg flex-shrink-0
                  ${sidebarOpen ? "w-7 h-7" : "w-9 h-9"}
                  ${active ? "bg-[#305CDE]" : "bg-gray-100 dark:bg-gray-800"}
                `}>
                  <Icon className={`flex-shrink-0 ${sidebarOpen ? "w-4 h-4" : "w-5 h-5"} ${active ? "text-white" : "text-gray-600 dark:text-gray-300"}`} />
                </div>
                {sidebarOpen && <span className="text-sm truncate">{label}</span>}
                {sidebarOpen && active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-[#305CDE]" />}
              </Link>
            );
          })}

          {boutiqueSlug && sidebarOpen && (
            <a
              href={`/shop/${boutiqueSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-2.5 py-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-[#305CDE]/10 hover:text-[#305CDE] transition-colors mt-1"
            >
              <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#305CDE]/10">
                <Eye className="w-4 h-4 text-[#305CDE]" />
              </div>
              <span className="text-sm truncate">Voir la vitrine</span>
            </a>
          )}
          {boutiqueSlug && !sidebarOpen && (
            <a
              href={`/shop/${boutiqueSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Voir la vitrine"
              className="flex justify-center py-2"
            >
              <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#305CDE]/10">
                <Eye className="w-5 h-5 text-[#305CDE]" />
              </div>
            </a>
          )}
        </nav>

        {/* Thème */}
        <div className="p-2.5 border-t border-gray-100 dark:border-gray-800 space-y-1">
          <button
            onClick={handleToggleTheme}
            title={darkMode ? "Mode clair" : "Mode sombre"}
            className={`w-full flex items-center gap-3 rounded-xl transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 ${sidebarOpen ? "px-2.5 py-2" : "px-0 py-2 justify-center"}`}
          >
            <div className={`flex items-center justify-center rounded-lg flex-shrink-0 ${darkMode ? "bg-yellow-400/20" : "bg-indigo-400/20"} ${sidebarOpen ? "w-7 h-7" : "w-9 h-9"}`}>
              {darkMode
                ? <Sun className={`text-yellow-400 flex-shrink-0 ${sidebarOpen ? "w-4 h-4" : "w-5 h-5"}`} />
                : <Moon className={`text-indigo-400 flex-shrink-0 ${sidebarOpen ? "w-4 h-4" : "w-5 h-5"}`} />
              }
            </div>
            {sidebarOpen && <span className="text-sm">{darkMode ? "Mode clair" : "Mode sombre"}</span>}
          </button>
        </div>
      </aside>

      {/* ── Zone principale ── */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 overflow-x-hidden min-w-0 w-0 ${sidebarOpen ? "lg:ml-56" : "lg:ml-[68px]"}`}>

        {/* Header mobile */}
        <header className="lg:hidden sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {mobileSidebarOpen
              ? <X className="w-5 h-5 text-gray-700 dark:text-gray-200" />
              : <Menu className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            }
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#305CDE] flex items-center justify-center flex-shrink-0">
              <Store className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="font-black text-sm text-gray-800 dark:text-gray-100 truncate">{boutiqueName}</p>
          </div>
          <div className="flex items-center gap-1">
            {boutiqueSlug && (
              <a
                href={`/shop/${boutiqueSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Voir la vitrine"
                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Eye className="w-4 h-4 text-[#305CDE]" />
              </a>
            )}
            <button
              onClick={handleToggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {darkMode
                ? <Sun className="w-4 h-4 text-yellow-400" />
                : <Moon className="w-4 h-4 text-indigo-400" />
              }
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden pb-20 lg:pb-6">
          {children}
        </main>

        <footer className="hidden lg:block py-2.5 px-6 border-t border-gray-100 dark:border-gray-800 text-center text-xs text-gray-400 dark:text-gray-600">
          Nexora Shop © {new Date().getFullYear()} — Tous droits réservés
        </footer>
      </div>

      {/* ── Barre de navigation en bas (mobile uniquement) ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
        <div className="flex items-stretch h-16">
          {bottomNavItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-all duration-150"
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#305CDE]" />
                )}
                <div className={`
                  w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150
                  ${active ? "bg-[#305CDE]/10 dark:bg-[#305CDE]/20 scale-110" : "bg-transparent"}
                `}>
                  <Icon className={`w-5 h-5 transition-colors ${active ? "text-[#305CDE]" : "text-gray-400 dark:text-gray-500"}`} />
                </div>
                <span className={`text-[10px] font-semibold leading-none transition-colors ${active ? "text-[#305CDE]" : "text-gray-400 dark:text-gray-500"}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
