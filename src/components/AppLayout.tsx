import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Lock, Image, Link2, User, LogOut, Menu, X,
  Search, ChevronRight, TrendingUp, History, Home,
  HandCoins, ArrowLeft, Receipt, Store, BadgeCheck, Map,
  ShieldCheck, ArrowLeftRight, Sun, Moon, Phone
} from "lucide-react";
import { clearSession, isAdminUser } from "@/lib/app-utils";
import { logoutUser, getNexoraUser, isNexoraAdmin, refreshNexoraSession } from "@/lib/nexora-auth";
import { Input } from "@/components/ui/input";
import { ReactNode } from "react";
import nexoraLogo from "@/assets/nexora-logo.png";
import NexoraNotifications from "@/components/NexoraNotifications";
import { initTheme, toggleTheme, getTheme } from "@/lib/theme";

const getNavItems = (isAdmin: boolean) => {
  const items = [
    { path: "/",                 icon: Home,            label: "Accueil",             color: "text-indigo-400",  bg: "bg-indigo-400/10"  },
    { path: "/dashboard",        icon: LayoutDashboard, label: "Tableau de bord",     color: "text-red-400",     bg: "bg-red-400/10"     },
    { path: "/entrees-depenses", icon: TrendingUp,      label: "Entrées & Dépenses",  color: "text-green-400",   bg: "bg-green-400/10"   },
    { path: "/historique",       icon: History,         label: "Historique",           color: "text-accent",      bg: "bg-accent/10"      },
    { path: "/transfert",        icon: ArrowLeftRight,  label: "Nexora Transfert",    color: "text-violet-400",  bg: "bg-violet-400/10"  },
    { path: "/factures",         icon: Receipt,         label: "Factures",             color: "text-purple-300",  bg: "bg-purple-300/10"  },
    { path: "/boutique",         icon: Store,           label: "Nexora Shop",          color: "text-pink-300",    bg: "bg-pink-300/10"    },
    { path: "/contacts-whatsapp", icon: Phone,           label: "Contacts WhatsApp",    color: "text-green-400",   bg: "bg-green-400/10"   },
    { path: "/immobilier",        icon: Map,             label: "Marché Immobilier",    color: "text-blue-300",    bg: "bg-blue-300/10"    },
  ];
  if (isAdmin) {
    items.push({ path: "/coffre-fort", icon: Lock,       label: "Coffre-fort",   color: "text-yellow-300", bg: "bg-yellow-300/10" });
    items.push({ path: "/liens",       icon: Link2,      label: "Liens & Contacts", color: "text-green-300", bg: "bg-green-300/10" });
    items.push({ path: "/prets",       icon: HandCoins,  label: "Contrats Prêt", color: "text-orange-300", bg: "bg-orange-300/10" });
    items.push({ path: "/admin",       icon: ShieldCheck, label: "Panel Admin", color: "text-amber-400", bg: "bg-amber-400/10" });
    items.push({ path: "/medias",      icon: Image,       label: "Médias",      color: "text-sky-300",   bg: "bg-sky-300/10"  });
  }
  return items;
};

interface AppLayoutProps {
  children: ReactNode;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  isDark?: boolean;
  headerActions?: ReactNode;
}


export default function AppLayout({
  children,
  searchQuery = "",
  onSearchChange,
  isDark,
  headerActions,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen]             = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [darkMode, setDarkMode]                   = useState(false);
  const location  = useLocation();
  const navigate  = useNavigate();

  /* ── Applique le thème global dès le montage (fonctionne sur TOUTES les pages) ── */
  useEffect(() => {
    if (isDark !== undefined) {
      applyThemeLocal(isDark ? "dark" : "light");
      setDarkMode(isDark);
    } else {
      initTheme();
      setDarkMode(getTheme() === "dark");
    }
  }, [isDark]);

  function applyThemeLocal(t: "dark" | "light") {
    if (t === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    try { localStorage.setItem("nexora-theme", t); } catch {}
  }

  useEffect(() => { refreshNexoraSession(); }, []);

  const handleToggleTheme = () => {
    const next = toggleTheme();
    setDarkMode(next === "dark");
  };

  const nexoraUser  = getNexoraUser();
  const adminUser   = isNexoraAdmin() || isAdminUser();
  const navItems    = getNavItems(adminUser);

  const displayName = nexoraUser?.nom_prenom || "Utilisateur";
  const displayRole = nexoraUser?.is_admin
    ? "Administrateur"
    : nexoraUser?.plan === "boss" || nexoraUser?.plan === "roi"
    ? "Premium"
    : "Gratuit";
  const hasBadge    = nexoraUser?.badge_premium || nexoraUser?.is_admin;
  const isAdminPage = location.pathname === "/admin";
  const canGoBack   = location.pathname !== "/dashboard";

  const currentPage = navItems.find(
    (i) =>
      i.path === location.pathname ||
      (i.path === "/boutique" && location.pathname.startsWith("/boutique")) ||
      (i.path === "/entrees-depenses" &&
        ["/entrees", "/depenses", "/entrees-depenses"].includes(location.pathname))
  );

  const handleLogout = async () => {
    await logoutUser();
    clearSession();
    navigate("/login");
  };

  if (isAdminPage) return <>{children}</>;

  return (
    <div className="min-h-screen flex bg-muted/30 dark:bg-gray-950 overflow-x-hidden max-w-[100vw]">
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-foreground/30 z-20 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed top-0 left-0 h-full z-30
        bg-sidebar dark:bg-gray-900
        border-r border-sidebar-border dark:border-gray-800
        text-sidebar-foreground flex flex-col
        transition-all duration-300 shadow-brand-lg
        ${sidebarOpen ? "w-60" : "w-[68px]"}
        ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-destructive flex-shrink-0" />

        {/* Profil */}
        <Link
          to="/profil"
          onClick={() => setMobileSidebarOpen(false)}
          className="flex items-center gap-3 px-3 py-3.5 border-b border-sidebar-border dark:border-gray-800 hover:bg-sidebar-accent dark:hover:bg-gray-800 transition-colors"
        >
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-xl overflow-hidden border-2 border-accent/60">
              {nexoraUser?.avatar_url ? (
                <img src={nexoraUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-accent/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-accent" />
                </div>
              )}
            </div>
          </div>
          {sidebarOpen && (
            <div className="min-w-0 flex-1">
              <div className="font-display font-black text-sm text-sidebar-foreground dark:text-gray-100 truncate flex items-center gap-1.5">
                {displayName.split(" ")[0]}
                {hasBadge && <BadgeCheck className="w-4 h-4 text-green-400 flex-shrink-0" />}
              </div>
              <div className="text-xs text-sidebar-foreground/50 dark:text-gray-400 truncate">{displayRole}</div>
            </div>
          )}
        </Link>

        {/* Logo + toggle collapse */}
        <div className={`flex items-center gap-2.5 px-3 py-2.5 border-b border-sidebar-border dark:border-gray-800 ${!sidebarOpen ? "justify-center" : ""}`}>
          <img src={nexoraLogo} alt="Nexora" className="w-6 h-6 object-contain flex-shrink-0" />
          {sidebarOpen && (
            <span className="font-display font-black text-xs text-sidebar-foreground dark:text-gray-100 tracking-widest flex-1">
              NEXORA
            </span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`hidden lg:flex w-6 h-6 items-center justify-center rounded hover:bg-sidebar-accent dark:hover:bg-gray-800 transition-colors flex-shrink-0 ${!sidebarOpen ? "ml-0" : "ml-auto"}`}
          >
            <ChevronRight className={`w-3.5 h-3.5 text-sidebar-foreground/70 dark:text-gray-400 transition-transform ${sidebarOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ path, icon: Icon, label, color, bg }) => {
            const active =
              location.pathname === path ||
              (path === "/boutique" && location.pathname.startsWith("/boutique")) ||
              (path === "/entrees-depenses" &&
                ["/entrees", "/depenses", "/entrees-depenses"].includes(location.pathname));
            const isAdminItem = path === "/admin";
            return (
              <div key={path}>
                {isAdminItem && (
                  <div className="my-2 mx-1">
                    <div className="h-px bg-sidebar-border dark:bg-gray-700 opacity-40" />
                    {sidebarOpen && (
                      <p className="text-[10px] font-bold text-sidebar-foreground/30 dark:text-gray-500 uppercase tracking-widest px-2 pt-2 pb-1">
                        Administration
                      </p>
                    )}
                  </div>
                )}
                <Link
                  to={path}
                  onClick={() => setMobileSidebarOpen(false)}
                  title={!sidebarOpen ? label : undefined}
                  className={`
                    flex items-center gap-3 rounded-xl transition-all duration-150
                    ${sidebarOpen ? "px-2.5 py-2" : "px-0 py-2 justify-center"}
                    ${active
                      ? "bg-accent text-accent-foreground font-semibold shadow-sm"
                      : "text-sidebar-foreground/75 dark:text-gray-300 hover:bg-sidebar-accent dark:hover:bg-gray-800 hover:text-sidebar-foreground dark:hover:text-white"
                    }
                  `}
                >
                  <div className={`
                    flex items-center justify-center rounded-lg flex-shrink-0
                    ${sidebarOpen ? "w-8 h-8" : "w-10 h-10"}
                    ${active ? "bg-white/20" : bg}
                    transition-all duration-150
                  `}>
                    <Icon className={`flex-shrink-0 ${sidebarOpen ? "w-4.5 h-4.5" : "w-5.5 h-5.5"} ${active ? "text-accent-foreground" : color}`} />
                  </div>
                  {sidebarOpen && <span className="text-[15px] font-semibold truncate">{label}</span>}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Thème + Déconnexion */}
        <div className="p-2.5 border-t border-sidebar-border dark:border-gray-800 space-y-1">
          <button
            onClick={handleToggleTheme}
            title={darkMode ? "Mode clair" : "Mode sombre"}
            className={`
              w-full flex items-center gap-3 rounded-xl transition-colors
              text-sidebar-foreground/70 dark:text-gray-300
              hover:bg-sidebar-accent dark:hover:bg-gray-800
              ${sidebarOpen ? "px-2.5 py-2" : "px-0 py-2 justify-center"}
            `}
          >
            <div className={`flex items-center justify-center rounded-lg flex-shrink-0 ${darkMode ? "bg-yellow-400/20" : "bg-indigo-400/20"} ${sidebarOpen ? "w-7 h-7" : "w-9 h-9"}`}>
              {darkMode
                ? <Sun className={`flex-shrink-0 text-yellow-400 ${sidebarOpen ? "w-4 h-4" : "w-5 h-5"}`} />
                : <Moon className={`flex-shrink-0 text-indigo-300 ${sidebarOpen ? "w-4 h-4" : "w-5 h-5"}`} />
              }
            </div>
            {sidebarOpen && <span className="text-sm">{darkMode ? "Mode clair" : "Mode sombre"}</span>}
          </button>

          {/* Déconnexion */}
          <button
            onClick={handleLogout}
            title="Déconnexion"
            className={`
              w-full flex items-center gap-3 rounded-xl text-sidebar-foreground/70 dark:text-gray-300
              hover:bg-destructive/20 hover:text-red-200 transition-colors
              ${sidebarOpen ? "px-2.5 py-2" : "px-0 py-2 justify-center"}
            `}
          >
            <div className={`flex items-center justify-center rounded-lg flex-shrink-0 bg-red-500/10 ${sidebarOpen ? "w-7 h-7" : "w-9 h-9"}`}>
              <LogOut className={`text-red-300 flex-shrink-0 ${sidebarOpen ? "w-4 h-4" : "w-5 h-5"}`} />
            </div>
            {sidebarOpen && <span className="text-sm">Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 overflow-x-hidden min-w-0 w-0 ${sidebarOpen ? "lg:ml-60" : "lg:ml-[68px]"}`}>

        {/* Header */}
        <header className="sticky top-0 z-10 bg-card dark:bg-gray-900 border-b border-border dark:border-gray-800 px-4 lg:px-6 h-14 flex items-center gap-3 shadow-sm">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted dark:hover:bg-gray-800 transition-colors"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {canGoBack && (
            <button
              onClick={() => navigate("/dashboard")}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted dark:hover:bg-gray-800 transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
              title="Retour au Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="flex-1 min-w-0 flex items-center gap-2">
            {currentPage && (
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${currentPage.bg}`}>
                <currentPage.icon className={`w-4 h-4 ${currentPage.color}`} />
              </div>
            )}
            <h2 className="font-display font-bold text-foreground dark:text-gray-100 text-base truncate">
              {currentPage?.label || "NEXORA"}
            </h2>
          </div>

          {onSearchChange && (
            <div className="relative hidden sm:block w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-8 bg-muted dark:bg-gray-800 border-0 focus:bg-card text-sm rounded-full"
              />
            </div>
          )}

          {headerActions}
          <NexoraNotifications />
        </header>

        <main className="flex-1 p-3 lg:p-5 overflow-x-hidden min-w-0 max-w-full">
          {children}
        </main>

        <footer className="py-2.5 px-6 border-t border-border dark:border-gray-800 text-center text-xs text-muted-foreground dark:text-gray-500">
          NEXORA © {new Date().getFullYear()} — Tous droits réservés
        </footer>
      </div>
    </div>
  );
}
