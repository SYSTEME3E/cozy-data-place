import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Lock, Image, Link2, User, LogOut, Menu, X,
  Search, ChevronRight, TrendingUp, History,
  HandCoins, Receipt, Store, BadgeCheck, Map,
  ShieldCheck, ArrowLeftRight, Sun, Moon, Phone, CreditCard,
  GraduationCap, Coins, BookOpen, Filter, Sparkles, Leaf, ClipboardList, ShoppingBag,
  Headphones, Users, Info, Zap, Tv2
} from "lucide-react";
import { clearSession, isAdminUser } from "@/lib/app-utils";
import { logoutUser, getNexoraUser, isNexoraAdmin, refreshNexoraSession } from "@/lib/nexora-auth";
import { Input } from "@/components/ui/input";
import { ReactNode } from "react";
import NexoraNotifications from "@/components/NexoraNotifications";
import { initTheme, toggleTheme, getTheme } from "@/lib/theme";


const getNavItems = (isAdmin: boolean) => {
  const items = [
    { path: "/dashboard",        icon: LayoutDashboard, label: "Tableau de bord",     color: "text-gray-700 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-700" },
    { path: "/mes-formations",   icon: BookOpen,        label: "Mes Formations",       color: "text-gray-700 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-700" },
    { path: "/nexora-academy",   icon: Sparkles,        label: "Nexora Academy",       color: "text-gray-700 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-700" },
    { path: "/transfert",        icon: ArrowLeftRight,  label: "Nexora Transfert",     color: "text-gray-700 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-700" },
    { path: "/electricite",      icon: Zap,             label: "Électricité",           color: "text-gray-700 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-700" },
    { path: "/canal-plus",       icon: Tv2,             label: "Canal+",                color: "text-gray-700 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-700" },
    { path: "/paylink",          icon: CreditCard,      label: "Nexora PayLink",       color: "text-gray-700 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-700" },
    { path: "/boutique",         icon: Store,           label: "Nexora Shop",          color: "text-gray-700 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-700" },
    { path: "/nexora-shop",      icon: ShoppingBag,     label: "Shopping Public",      color: "text-gray-700 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-700" },
    { path: "/support",          icon: Headphones,      label: "Support",              color: "text-gray-700 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-700" },
    { path: "/communaute",       icon: Users,           label: "Communauté",           color: "text-gray-700 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-700" },
    { path: "/a-propos",         icon: Info,            label: "À propos",             color: "text-gray-700 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-700" },
  ];
  if (isAdmin) {
    items.push({ path: "/coffre-fort",       icon: Lock,          label: "Coffre-fort",         color: "text-gray-700 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-700" });
    items.push({ path: "/liens",             icon: Link2,         label: "Liens & Contacts",    color: "text-gray-700 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-700" });
    items.push({ path: "/prets",             icon: HandCoins,     label: "Contrats Prêt",       color: "text-gray-700 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-700" });
    items.push({ path: "/admin",             icon: ShieldCheck,   label: "Panel Admin",         color: "text-gray-700 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-700" });
    items.push({ path: "/yupi-commandes",    icon: ClipboardList, label: "Commandes YUPI",      color: "text-gray-700 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-700" });
    items.push({ path: "/admin/formations",  icon: GraduationCap, label: "Gestion Formations",  color: "text-gray-700 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-700" });
    items.push({ path: "/medias",            icon: Image,         label: "Médias",               color: "text-gray-700 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-700" });
  }
  return items;
};

// Pages affichées dans la barre de navigation en bas (mobile uniquement)
const bottomNavItems = [
  { path: "/dashboard",    icon: LayoutDashboard, label: "Dashboard"  },
  { path: "/immobilier",   icon: Map,             label: "Immobilier" },
  { path: "/transfert",    icon: ArrowLeftRight,  label: "Transfert"  },
  { path: "/nexora-shop",  icon: ShoppingBag,     label: "Shop Public"},
  { path: "/boutique",     icon: Store,           label: "Shop"       },
];

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
    try { localStorage.setItem("nexora-theme", t); } catch (e) { console.warn("Erreur ignorée:", e); }
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

  const currentPage = navItems.find(
    (i) =>
      i.path === location.pathname ||
      (i.path === "/boutique" && location.pathname.startsWith("/boutique") && !location.pathname.startsWith("/boutique/bien-etre-yupi")) ||
      (i.path === "/boutique/bien-etre-yupi" && location.pathname === "/boutique/bien-etre-yupi") ||
      (i.path === "/formations" && location.pathname.startsWith("/formations") && !location.pathname.startsWith("/formations/")) ||
      (i.path === "/mes-formations" && location.pathname === "/mes-formations")
  );

  const handleLogout = async () => {
    await logoutUser();
    navigate("/login", { replace: true });
  };

  if (isAdminPage) return <>{children}</>;

  return (
    <div className="min-h-screen flex bg-muted/30 dark:bg-gray-950 overflow-x-hidden max-w-[100vw]">
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-foreground/30 z-[200] lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed top-0 left-0 h-full z-[300]
        bg-white dark:bg-gray-900
        border-r border-gray-200 dark:border-gray-800
        text-gray-800 flex flex-col
        transition-all duration-300 shadow-xl
        ${sidebarOpen ? "w-60" : "w-[68px]"}
        ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Profil */}
        <div className="flex items-center border-b border-gray-200 dark:border-gray-800">
          <Link
            to="/profil"
            onClick={() => setMobileSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-3.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-1 min-w-0`}
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
                <div className="font-display font-black text-sm text-gray-800 dark:text-gray-100 truncate flex items-center gap-1.5">
                  {displayName.split(" ")[0]}
                  {hasBadge && <BadgeCheck className="w-4 h-4 text-green-400 flex-shrink-0" />}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-400 truncate">{displayRole}</div>
              </div>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex w-8 h-8 items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0 mr-2"
          >
            <ChevronRight className={`w-3.5 h-3.5 text-gray-500 dark:text-gray-400 transition-transform ${sidebarOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ path, icon: Icon, label, color, bg }) => {
            const active =
              location.pathname === path ||
              (path === "/boutique" && location.pathname.startsWith("/boutique") && !location.pathname.startsWith("/boutique/bien-etre-yupi")) ||
              (path === "/formations" && location.pathname.startsWith("/formations"));
            const isAdminItem = path === "/admin";
            return (
              <div key={path}>
                {isAdminItem && (
                  <div className="my-2 mx-1">
                    <div className="h-px bg-gray-200 dark:bg-gray-700 opacity-40" />
                    {sidebarOpen && (
                      <p className="text-[10px] font-bold text-gray-300 dark:text-gray-500 uppercase tracking-widest px-2 pt-2 pb-1">
                        Administration
                      </p>
                    )}
                  </div>
                )}
                {path === "/nexora-shop" && (
                  <div className="my-2 mx-1">
                    <div className="h-px bg-gray-200 dark:bg-gray-700 opacity-40" />
                  </div>
                )}
                <Link
                  to={path}
                  onClick={() => setMobileSidebarOpen(false)}
                  title={!sidebarOpen ? label : undefined}
                  className={`
                    ${bottomNavItems.some(i => i.path === path) ? "hidden lg:flex" : "flex"} items-center gap-3 rounded-xl transition-all duration-150
                    ${sidebarOpen ? "px-2.5 py-2" : "px-0 py-2 justify-center"}
                    ${path === "/nexora-shop"
                      ? active
                        ? "bg-green-500/20 text-green-600 font-semibold shadow-sm ring-1 ring-green-400/30"
                        : "text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 font-semibold"
                      : active
                        ? "bg-sky-500/15 text-sky-500 font-semibold shadow-sm"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
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
                  {sidebarOpen && <span className="text-[15px] font-semibold truncate flex items-center gap-1.5">
                    {label}
                    {path === "/nexora-shop" && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-white flex-shrink-0" style={{ background: "#008000" }}>
                        LIVE
                      </span>
                    )}
                  </span>}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Thème + Déconnexion */}
        <div className="p-2.5 pb-20 lg:pb-2.5 border-t border-gray-200 dark:border-gray-800 space-y-1">
          <button
            onClick={handleToggleTheme}
            title={darkMode ? "Mode clair" : "Mode sombre"}
            className={`
              w-full flex items-center gap-3 rounded-xl transition-colors
              text-gray-500 dark:text-gray-300
              hover:bg-gray-100 dark:hover:bg-gray-800
              ${sidebarOpen ? "px-2.5 py-2" : "px-0 py-2 justify-center"}
            `}
          >
            <div className={`flex items-center justify-center rounded-lg flex-shrink-0 bg-gray-100 dark:bg-gray-700 ${sidebarOpen ? "w-7 h-7" : "w-9 h-9"}`}>
              {darkMode
                ? <Sun className={`flex-shrink-0 text-gray-700 dark:text-gray-300 ${sidebarOpen ? "w-4 h-4" : "w-5 h-5"}`} />
                : <Moon className={`flex-shrink-0 text-gray-700 dark:text-gray-300 ${sidebarOpen ? "w-4 h-4" : "w-5 h-5"}`} />
              }
            </div>
            {sidebarOpen && <span className="text-sm">{darkMode ? "Mode clair" : "Mode sombre"}</span>}
          </button>

          {/* Déconnexion */}
          <button
            onClick={handleLogout}
            title="Déconnexion"
            className={`
              w-full flex items-center gap-3 rounded-xl text-gray-500 dark:text-gray-300
              hover:bg-destructive/20 hover:text-red-200 transition-colors
              ${sidebarOpen ? "px-2.5 py-2" : "px-0 py-2 justify-center"}
            `}
          >
            <div className={`flex items-center justify-center rounded-lg flex-shrink-0 bg-gray-100 dark:bg-gray-700 ${sidebarOpen ? "w-7 h-7" : "w-9 h-9"}`}>
              <LogOut className={`text-gray-700 dark:text-gray-300 flex-shrink-0 ${sidebarOpen ? "w-4 h-4" : "w-5 h-5"}`} />
            </div>
            {sidebarOpen && <span className="text-sm">Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 overflow-x-hidden min-w-0 w-0 ${sidebarOpen ? "lg:ml-60" : "lg:ml-[68px]"}`}>

        {/* Header */}
        <header className="sticky top-0 z-10 bg-card dark:bg-gray-900 border-b border-border dark:border-gray-800 px-4 lg:px-6 h-14 flex items-center gap-3 shadow-sm">
          {/* Avatar / profil — ouvre le menu latéral sur mobile */}
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full overflow-hidden border-2 border-white/80 shadow-sm transition-all flex-shrink-0"
            style={{ background: "#0ea5e9" }}
          >
            {nexoraUser?.avatar_url ? (
              <img src={nexoraUser.avatar_url} alt="Profil" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-white" />
            )}
          </button>

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

        <main className="flex-1 p-3 lg:p-5 overflow-x-hidden min-w-0 max-w-full pb-20 lg:pb-5">
          {children}
        </main>

        <footer className="hidden lg:flex py-2.5 px-6 border-t border-border dark:border-gray-800 items-center justify-between text-xs text-muted-foreground dark:text-gray-500">
          <span>NEXORA © {new Date().getFullYear()} — Tous droits réservés</span>
          <div className="flex items-center gap-4">
            <a href="/cgu" className="hover:text-foreground transition-colors">CGU</a>
            <a href="/cgv" className="hover:text-foreground transition-colors">CGV</a>
            <a href="/confidentialite" className="hover:text-foreground transition-colors">Confidentialité</a>
            <a href="/cookies" className="hover:text-foreground transition-colors">Cookies</a>
            <a href="/mentions-legales" className="hover:text-foreground transition-colors">Mentions légales</a>
          </div>
        </footer>
      </div>

      {/* ── Barre de navigation en bas (mobile uniquement) ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#2a52c5] shadow-[0_-2px_12px_rgba(48,92,222,0.3)]" style={{ backgroundColor: "#305CDE" }}>
        <div className="flex items-stretch h-16">
          {bottomNavItems.map(({ path, icon: Icon, label }, idx) => {
            const active =
              location.pathname === path ||
              (path === "/boutique" && location.pathname.startsWith("/boutique") && !location.pathname.startsWith("/boutique/bien-etre-yupi"));
            const isCenter = idx === 2;

            if (isCenter) {
              return (
                <Link
                  key={path}
                  to={path}
                  className="flex-1 flex flex-col items-center justify-end pb-1.5 gap-0.5 relative"
                >
                  <div className={`w-14 h-14 flex items-center justify-center rounded-full shadow-lg -mt-6 transition-all duration-150 ${active ? "scale-110" : ""}`}
                    style={{ backgroundColor: "#FF1100", boxShadow: "0 4px 16px rgba(255,17,0,0.45)" }}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold leading-none text-white">
                    {label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={path}
                to={path}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-all duration-150"
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-white" />
                )}
                <div className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 ${active ? "bg-white/20 scale-110" : "bg-transparent"}`}>
                  <Icon className={`w-5 h-5 transition-colors ${active ? "text-white" : "text-white/70"}`} />
                </div>
                <span className={`text-[10px] font-semibold leading-none transition-colors ${active ? "text-white" : "text-white/70"}`}>
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
