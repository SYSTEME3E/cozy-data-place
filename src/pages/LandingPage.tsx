import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { initTheme, toggleTheme, getTheme } from "@/lib/theme";
import {
  ArrowRight, Zap, ShieldCheck, Globe, BarChart3, Receipt,
  Store, Home, Lock, Send, Star, TrendingUp, FileText,
  CreditCard, Wallet, ChevronDown, Menu, X, Sparkles,
  Users, ArrowDownLeft, ArrowUpRight, Facebook, Twitter,
  CheckCircle2, Clock, Play, MessageSquare, Sun, Moon,
  Download
} from "lucide-react";

// â”€â”€â”€ CONSTANTES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const LOGO = "https://i.postimg.cc/c1QgbZsG/ei_1773937801458_removebg_preview.png";

const OPERATORS = [
  { name: "MTN MoMo" }, { name: "Orange Money" }, { name: "Moov Money" },
  { name: "Wave" }, { name: "M-Pesa" }, { name: "Airtel Money" },
  { name: "Flooz" }, { name: "T-Money" }, { name: "Free Money" },
];

const FEATURES = [
  {
    icon: BarChart3, color: "#6366f1", bg: "#eef2ff",
    title: "Gestion FinanciÃ¨re", tag: "Disponible",
    desc: "Pilotez vos finances avec prÃ©cision. Enregistrez vos entrÃ©es d'argent, suivez vos dÃ©penses par catÃ©gorie, consultez votre historique complet et visualisez votre Ã©volution financiÃ¨re grÃ¢ce Ã  des graphiques clairs et interactifs.",
    points: ["Tableau de bord en temps rÃ©el", "CatÃ©gorisation automatique", "Export PDF & Excel", "Rapports mensuels"],
  },
  {
    icon: Receipt, color: "#10b981", bg: "#ecfdf5",
    title: "Facturation Professionnelle", tag: "Disponible",
    desc: "CrÃ©ez des factures PDF magnifiques et professionnelles en moins d'une minute. Ajoutez vos informations fiscales, et tÃ©lÃ©chargez ou partagez instantanÃ©ment.",
    points: ["PDF haute qualitÃ©", "Branding personnalisÃ©", "NumÃ©rotation automatique", "Archivage illimitÃ©"],
  },
  {
    icon: Store, color: "#f43f5e", bg: "#fff1f2",
    title: "Boutique E-commerce", tag: "Disponible",
    desc: "Lancez votre boutique en ligne en quelques clics. Publiez vos produits physiques ou digitaux, gÃ©rez votre catalogue, suivez vos commandes et encaissez vos paiements.",
    points: ["Vitrine publique personnalisÃ©e", "Gestion des stocks", "Suivi des commandes", "Produits digitaux & physiques"],
  },
  {
    icon: Send, color: "#0ea5e9", bg: "#f0f9ff",
    title: "Transfert d'Argent Africa", tag: "Disponible",
    desc: "Envoyez de l'argent partout en Afrique via Mobile Money en quelques secondes. Rechargez votre compte gratuitement, transfÃ©rez vers 24 pays actifs avec seulement 3% de frais.",
    points: ["Payez 100 FCFA comme frais du rechargement", "24 pays actifs", "3% de frais seulement", "Facture PDF automatique"],
  },
  {
    icon: Home, color: "#8b5cf6", bg: "#f5f3ff",
    title: "MarchÃ© Immobilier", tag: "Disponible",
    desc: "Publiez et dÃ©couvrez des biens immobiliers dans toute l'Afrique. Maisons, appartements, terrains, bureaux â€” achat ou location.",
    points: ["Annonces illimitÃ©es", "Profil vendeur vÃ©rifiÃ©", "Photos HD", "Contact direct sÃ©curisÃ©"],
  },
  {
    icon: Users, color: "#25d366", bg: "#f0fdf4",
    title: "Contacts WhatsApp", tag: "Disponible",
    desc: "AccÃ©dez aux contacts WhatsApp des membres NEXORA. TÃ©lÃ©chargez-les en format .vcf pour les importer directement dans votre tÃ©lÃ©phone. RÃ©seau de confiance, membres vÃ©rifiÃ©s.",
    points: ["Contacts membres vÃ©rifiÃ©s", "Export .vcf (vCard)", "Import direct sur mobile", "RÃ©seau de confiance"],
  },
  {
    icon: Wallet, color: "#14b8a6", bg: "#f0fdfa",
    title: "Abonnements & Liens", tag: "Disponible",
    desc: "GÃ©rez tous vos abonnements en un seul endroit. CrÃ©ez des liens courts personnalisÃ©s pour partager vos rÃ©seaux et contacts.",
    points: ["Suivi de tous vos abonnements", "Alertes renouvellement", "Liens courts personnalisÃ©s", "Partage facile"],
  },
];

const ROADMAP = [
  { title: "Carte NEXORA Virtuelle", desc: "Payez partout dans le monde avec votre carte virtuelle NEXORA. Compatible avec les paiements en ligne internationaux.", status: "soon", pct: 65 },
  { title: "Wallet Multi-devises", desc: "GÃ©rez XOF, GHS, NGN, KES et d'autres devises africaines depuis un seul portefeuille unifiÃ©.", status: "soon", pct: 40 },
  { title: "NEXORA Business", desc: "Tableau de bord entreprise avec multi-utilisateurs, rÃ´les, permissions et reporting avancÃ©.", status: "soon", pct: 20 },
  { title: "24 pays couverts", desc: "Mali, Burkina, Cameroun, Ghana, NigÃ©ria, Kenya, Tanzanie, Ouganda, Rwanda, GuinÃ©e, RD Congo, Gabon, Congo, Maroc, Gambie, Sierra Leone, Liberia, Mozambique, Zambie et plus.", status: "soon", pct: 30 },
];

const STATS = [
  { value: "24", label: "Pays Ã©ligibles pour le service du Transfert", suffix: "" },
  { value: "99.9", label: "DisponibilitÃ©", suffix: "%" },
  { value: "8", label: "Modules intÃ©grÃ©s", suffix: "" },
  { value: "0", label: "Frais d'inscription", suffix: " FCFA" },
];

const COUNTRIES_ACTIVE = [
  { flag: "ðŸ‡§ðŸ‡¯", name: "BÃ©nin", networks: "MTN Â· Moov" },
  { flag: "ðŸ‡¨ðŸ‡®", name: "CÃ´te d'Ivoire", networks: "Orange Â· MTN Â· Wave" },
  { flag: "ðŸ‡¹ðŸ‡¬", name: "Togo", networks: "Flooz Â· T-Money" },
  { flag: "ðŸ‡¸ðŸ‡³", name: "SÃ©nÃ©gal", networks: "Orange Â· Wave Â· Free" },
  { flag: "ðŸ‡³ðŸ‡ª", name: "Niger", networks: "Airtel Â· Moov" },
  { flag: "ðŸ‡²ðŸ‡±", name: "Mali", networks: "Orange Â· Moov Â· Wave" },
  { flag: "ðŸ‡§ðŸ‡«", name: "Burkina Faso", networks: "Orange Â· Moov" },
  { flag: "ðŸ‡¨ðŸ‡²", name: "Cameroun", networks: "MTN Â· Orange" },
  { flag: "ðŸ‡¬ðŸ‡­", name: "Ghana", networks: "MTN Â· Vodafone Â· AirtelTigo" },
  { flag: "ðŸ‡³ðŸ‡¬", name: "NigÃ©ria", networks: "MTN Â· Airtel Â· Glo" },
  { flag: "ðŸ‡°ðŸ‡ª", name: "Kenya", networks: "M-Pesa Â· Airtel" },
  { flag: "ðŸ‡¹ðŸ‡¿", name: "Tanzanie", networks: "M-Pesa Â· Tigo" },
  { flag: "ðŸ‡ºðŸ‡¬", name: "Ouganda", networks: "MTN Â· Airtel" },
  { flag: "ðŸ‡·ðŸ‡¼", name: "Rwanda", networks: "MTN Â· Airtel" },
  { flag: "ðŸ‡¬ðŸ‡³", name: "GuinÃ©e", networks: "Orange Â· MTN" },
  { flag: "ðŸ‡¨ðŸ‡©", name: "RD Congo", networks: "Vodacom Â· Airtel" },
  { flag: "ðŸ‡¬ðŸ‡¦", name: "Gabon", networks: "Airtel Â· MTN" },
  { flag: "ðŸ‡¨ðŸ‡¬", name: "Congo", networks: "MTN Â· Airtel" },
  { flag: "ðŸ‡²ðŸ‡¦", name: "Maroc", networks: "Orange Â· Maroc Telecom" },
  { flag: "ðŸ‡¸ðŸ‡³", name: "Gambie", networks: "Africell Â· QCell" },
  { flag: "ðŸ‡¸ðŸ‡±", name: "Sierra Leone", networks: "Orange Â· Africell" },
  { flag: "ðŸ‡±ðŸ‡·", name: "Liberia", networks: "MTN Â· Lonestar" },
  { flag: "ðŸ‡²ðŸ‡¿", name: "Mozambique", networks: "M-Pesa Â· Airtel" },
  { flag: "ðŸ‡¿ðŸ‡²", name: "Zambie", networks: "MTN Â· Airtel" },
];

// â”€â”€â”€ HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SectionBadge({ text, color = "#6366f1" }: { text: string; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest"
      style={{ background: color + "20", color, border: `1px solid ${color}35` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {text}
    </span>
  );
}

function AnimatedCounter({ value, suffix }: { value: string; suffix: string }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLDivElement>(null);
  const ran = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !ran.current) {
          ran.current = true;
          const target = parseFloat(value);
          let step = 0;
          const steps = 40;
          const t = setInterval(() => {
            step++;
            const ease = 1 - Math.pow(1 - step / steps, 3);
            const cur = target * ease;
            setDisplay(Number.isInteger(target) ? Math.round(cur).toString() : cur.toFixed(1));
            if (step >= steps) clearInterval(t);
          }, 1200 / steps);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [value]);
  return <span ref={ref}>{display}{suffix}</span>;
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        open
          ? "border-indigo-200 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30"
          : "border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800"
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
      >
        <span className="font-black text-[15px] text-gray-900 dark:text-white">{question}</span>
        <ChevronDown
          className={`w-5 h-5 flex-shrink-0 text-indigo-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-5">
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    initTheme();
    setDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  const [reviewForm, setReviewForm] = useState({ name: "", country: "", text: "", stars: 5 });
  const [reviews, setReviews] = useState<{ name: string; country: string; text: string; stars: number }[]>([
    { name: "AÃ¯cha KonÃ©", country: "ðŸ‡§ðŸ‡¯ BÃ©nin", text: "NEXORA m'a permis de gÃ©rer ma boutique et mes factures depuis mon tÃ©lÃ©phone. Un vrai gain de temps au quotidien !", stars: 5 },
    { name: "Eric Mensah", country: "ðŸ‡¨ðŸ‡® CÃ´te d'Ivoire", text: "L'interface est intuitive, le module immobilier est gÃ©nial. Je gÃ¨re tout mon patrimoine depuis une seule appli.", stars: 5 },
    { name: "Fatou Diallo", country: "ðŸ‡¸ðŸ‡³ SÃ©nÃ©gal", text: "Les factures PDF sont magnifiques, mes clients sont impressionnÃ©s. Le transfert d'argent fonctionne parfaitement.", stars: 5 },
  ]);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await (supabase as any)
          .from("avis_produits")
          .select("*")
          .is("produit_id", null)
          .is("annonce_id", null)
          .order("created_at", { ascending: false })
          .limit(50);
        if (data && data.length > 0) {
          const dbReviews = data.map((r: any) => ({
            name: r.user_nom,
            country: "",
            text: r.commentaire,
            stars: r.note,
          }));
          setReviews((prev) => [...dbReviews, ...prev.slice(0, 3)]);
        }
      } catch (e) {
        console.error("Erreur chargement avis:", e);
      }
    };
    loadReviews();
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const submitReview = async () => {
    const nameParts = reviewForm.name.trim().split(/\s+/);
    if (nameParts.length < 2 || !nameParts[1] || nameParts[1].length < 2) {
      alert("Veuillez entrer votre nom complet (prÃ©nom et nom de famille).");
      return;
    }
    if (!reviewForm.text.trim()) return;
    const newReview = {
      name: reviewForm.name,
      country: reviewForm.country,
      text: reviewForm.text,
      stars: reviewForm.stars,
    };
    setReviews((prev) => [newReview, ...prev]);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await (supabase as any).from("avis_produits").insert({
        user_nom: reviewForm.name,
        commentaire: reviewForm.text,
        note: reviewForm.stars,
        user_id: "00000000-0000-0000-0000-000000000000",
        produit_id: null,
        annonce_id: null,
      });
    } catch (e) {
      console.error("Erreur envoi avis:", e);
    }
    setReviewForm({ name: "", country: "", text: "", stars: 5 });
  };

  return (
    <div
      className="min-h-screen bg-white dark:bg-[#0a0f1e] text-gray-900 dark:text-gray-100 overflow-x-hidden"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900;1,9..40,400&family=Clash+Display:wght@400;500;600;700&family=Cabinet+Grotesk:wght@400;500;700;800;900&display=swap');
        .font-display { font-family: 'Cabinet Grotesk', 'DM Sans', sans-serif; font-weight: 800; }
        h1,h2,h3 { font-family: 'Cabinet Grotesk', 'DM Sans', sans-serif; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scaleIn { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
        .anim-float { animation: float 5s ease-in-out infinite; }
        .anim-marquee { animation: marquee 30s linear infinite; }
        .anim-fadeup { opacity:0; animation: fadeUp .65s ease forwards; }
        .anim-scalein { animation: scaleIn .4s ease forwards; }
        .card-lift { transition: all .3s cubic-bezier(.4,0,.2,1); }
        .card-lift:hover { transform: translateY(-5px); box-shadow: 0 20px 40px -10px rgba(0,0,0,.18); }
        .grad-text { background: linear-gradient(135deg,#6366f1,#8b5cf6 40%,#ec4899); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .mesh { background: radial-gradient(ellipse at 15% 15%,#eef2ff 0%,transparent 55%), radial-gradient(ellipse at 85% 10%,#fdf2f8 0%,transparent 50%), radial-gradient(ellipse at 85% 85%,#ecfdf5 0%,transparent 50%), #ffffff; }
        .dark .mesh { background: radial-gradient(ellipse at 15% 15%,#1e1b4b33 0%,transparent 55%), radial-gradient(ellipse at 85% 10%,#1e1040 0%,transparent 50%), #0a0f1e; }
        .glass { background: rgba(255,255,255,0.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
        .dark .glass { background: rgba(10,15,30,0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
        .img-violet-border { border: 2px solid #7c3aed; box-shadow: 0 0 16px 2px #7c3aed66, 0 0 40px 4px #7c3aed33; }
        input, textarea { font-family: 'DM Sans', sans-serif; }
        .dark input, .dark textarea { background: #1e2433 !important; color: #f1f5f9 !important; border-color: #334155 !important; }
        .dark input::placeholder, .dark textarea::placeholder { color: #64748b !important; }
        .dark input:focus, .dark textarea:focus { border-color: #6366f1 !important; }
        @media(max-width:768px){ h1{font-size:2.5rem !important; line-height:1.1 !important;} h2{font-size:2rem !important;} }
      `}</style>

      {/* â”€â”€ TOP BANNER â”€â”€ */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 py-2.5 text-center text-white text-xs font-bold tracking-wide">
        ðŸŒ NEXORA disponible dans plusieurs pays africains â€” Transferts, Boutique, Immobilier etc...&nbsp;Â·&nbsp;
        <button onClick={() => navigate("/login")} className="underline underline-offset-2 hover:no-underline">
          Commencer gratuitement â†’
        </button>
      </div>

      {/* â”€â”€ NAVBAR â”€â”€ */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled ? "glass border-b border-gray-100 dark:border-white/10 shadow-sm" : "bg-white/0 dark:bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-[68px] flex items-center justify-between">
          <button onClick={() => scrollTo("hero")} className="flex items-center gap-3">
            <img src={LOGO} alt="NEXORA" className="w-9 h-9 object-contain" />
            <span className="font-display text-xl tracking-tight text-gray-900 dark:text-white">NEXORA</span>
          </button>

          <div className="hidden md:flex items-center gap-7 text-[13.5px] font-semibold text-gray-500 dark:text-gray-400">
            {[
              ["features", "FonctionnalitÃ©s"],
              ["transfert", "Transfert"],
              ["roadmap", "Roadmap"],
              ["faq", "FAQ"],
              ["avis", "Avis"],
              ["download", "ðŸ“± App"],
            ].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="hover:text-gray-900 dark:hover:text-white transition-colors">
                {label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => {
                const t = toggleTheme();
                setDarkMode(t === "dark");
              }}
              className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
              title={darkMode ? "Mode clair" : "Mode sombre"}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => navigate("/login")}
              className="text-[13.5px] font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-2 transition-colors"
            >
              Connexion
            </button>
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-1.5 text-[13.5px] font-bold bg-gray-950 dark:bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-all duration-300 shadow-sm"
            >
              CrÃ©er un compte <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            className="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden glass border-b border-gray-100 dark:border-white/10 px-6 pb-5 pt-2 flex flex-col gap-1">
            {[
              ["features", "FonctionnalitÃ©s"],
              ["transfert", "Transfert Africa"],
              ["roadmap", "Roadmap"],
              ["faq", "FAQ"],
              ["avis", "Avis"],
              ["download", "ðŸ“± App"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="text-left px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors"
              >
                {label}
              </button>
            ))}
            <div className="border-t border-gray-100 dark:border-white/10 mt-2 pt-3 flex gap-2">
              <button
                onClick={() => navigate("/login")}
                className="flex-1 py-2.5 text-sm font-bold border border-gray-200 dark:border-white/20 text-gray-900 dark:text-white rounded-xl hover:border-gray-300 transition-colors"
              >
                Connexion
              </button>
              <button
                onClick={() => navigate("/login")}
                className="flex-1 py-2.5 text-sm font-bold bg-gray-950 dark:bg-indigo-600 text-white rounded-xl hover:bg-indigo-600 transition-colors"
              >
                CrÃ©er un compte
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* â”€â”€ HERO â”€â”€ */}
      <section id="hero" className="mesh relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-indigo-200/30 dark:bg-indigo-800/20 blur-3xl" />
          <div className="absolute top-1/3 -right-20 w-80 h-80 rounded-full bg-pink-200/30 dark:bg-pink-900/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-60 h-60 rounded-full bg-violet-200/25 dark:bg-violet-900/20 blur-2xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-5 md:px-8 pt-14 pb-20 md:pt-20 md:pb-28">
          <div className="flex justify-center mb-7">
            <div className="anim-fadeup inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-white/10 border border-indigo-100 dark:border-indigo-700 shadow-md text-xs font-black text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" />
              Plateforme financiÃ¨re tout-en-un Â· Afrique
              <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-full text-[10px] font-black">NOUVEAU</span>
            </div>
          </div>

          <div className="text-center">
            <h1
              className="anim-fadeup text-[3.2rem] md:text-[5.5rem] font-black tracking-tight leading-[1.04] mb-7 text-gray-950 dark:text-white"
              style={{ animationDelay: ".08s" }}
            >
              GÃ©rez votre<br />
              <span className="grad-text">argent, boutique</span><br />
              <span>et vos factures</span>
            </h1>

            <p
              className="anim-fadeup text-gray-500 dark:text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-normal"
              style={{ animationDelay: ".18s" }}
            >
              NEXORA rÃ©unit la gestion financiÃ¨re, la facturation, l'e-commerce, l'immobilier, les contacts WhatsApp et le transfert d'argent... dans une seule application moderne, sÃ©curisÃ©e et conÃ§ue pour l'Afrique.
            </p>

            <div
              className="anim-fadeup flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
              style={{ animationDelay: ".28s" }}
            >
              <button
                onClick={() => navigate("/login")}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-[15px] px-8 py-4 rounded-2xl shadow-xl shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95"
              >
                Commencer gratuitement <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setVideoOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 text-gray-700 dark:text-gray-200 font-semibold text-[15px] px-7 py-4 rounded-2xl border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-white/40 transition-all"
              >
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Play className="w-3 h-3 text-white fill-white" />
                </div>
                Voir la dÃ©mo
              </button>
            </div>

            <div
              className="anim-fadeup flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-gray-400 dark:text-gray-400 font-medium"
              style={{ animationDelay: ".38s" }}
            >
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-500" /> DonnÃ©es chiffrÃ©es</span>
              <span className="hidden sm:block w-1 h-1 rounded-full bg-gray-200 dark:bg-gray-600" />
              <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-amber-400" /> 99.9% disponibilitÃ©</span>
              <span className="hidden sm:block w-1 h-1 rounded-full bg-gray-200 dark:bg-gray-600" />
              <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-indigo-500" /> 24 pays actifs pour le service du Transfert</span>
              <span className="hidden sm:block w-1 h-1 rounded-full bg-gray-200 dark:bg-gray-600" />
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-pink-500" /> Inscription gratuite</span>
            </div>
          </div>

          {/* Floating cards */}
          <div className="anim-fadeup mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto" style={{ animationDelay: ".5s" }}>
            {[
              { icon: Wallet, label: "Solde total", value: "842 500 FCFA", color: "#6366f1" },
              { icon: TrendingUp, label: "Ce mois", value: "+127 400 FCFA", color: "#10b981" },
              { icon: FileText, label: "Factures", value: "29 crÃ©Ã©es", color: "#f59e0b" },
              { icon: Send, label: "Transferts", value: "24 pays actifs", color: "#0ea5e9" },
            ].map((c, i) => {
              const Icon = c.icon;
              return (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-xl border border-gray-50 dark:border-gray-700 anim-float"
                  style={{ animationDelay: `${i * 0.4}s` }}
                >
                  {/* CORRECTION : w-4.5 n'existe pas en Tailwind â†’ remplacÃ© par w-5 h-5 */}
                  <div className="w-9 h-9 rounded-xl mb-3 flex items-center justify-center" style={{ background: c.color + "25" }}>
                    <Icon className="w-5 h-5" style={{ color: c.color }} />
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-400 font-bold uppercase tracking-wider mb-0.5">{c.label}</p>
                  <p className="font-black text-[13px] text-gray-900 dark:text-white leading-tight">{c.value}</p>
                </div>
              );
            })}
          </div>

          {/* Screenshot */}
          <div className="anim-fadeup mt-12 max-w-5xl mx-auto" style={{ animationDelay: ".6s" }}>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl img-violet-border">
              <img
                src="https://i.postimg.cc/fRtP8L5N/nexora.png"
                alt="Dashboard NEXORA"
                className="w-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950/60 via-transparent to-transparent flex items-end p-8">
                <div className="text-white">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">Interface NEXORA</p>
                  <p className="font-black text-xl">Votre tableau de bord financier</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ VIDEO MODAL â”€â”€ */}
      {videoOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 anim-scalein"
          onClick={() => setVideoOpen(false)}
        >
          <div
            className="w-full max-w-4xl bg-gray-950 rounded-3xl overflow-hidden shadow-2xl img-violet-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <p className="text-white font-bold">PrÃ©sentation NEXORA</p>
              <button
                onClick={() => setVideoOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="aspect-video bg-black">
              {/* CORRECTION : URL YouTube corrigÃ©e â€” youtu.be â†’ youtube.com/embed/ */}
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/2whA5HSFhio?si=0IhWYz1oPrLYgTcI"
                title="PrÃ©sentation NEXORA"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ OPÃ‰RATEURS MARQUEE â”€â”€ */}
      <section className="bg-gray-50 dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800 py-4 overflow-hidden">
        <p className="text-center text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-3">
          OpÃ©rateurs Mobile Money supportÃ©s
        </p>
        <div className="relative overflow-hidden">
          <div className="anim-marquee flex gap-10 whitespace-nowrap">
            {[...OPERATORS, ...OPERATORS].map((op, i) => (
              <span
                key={i}
                className="flex-shrink-0 px-4 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-bold text-gray-600 dark:text-gray-300 shadow-sm"
              >
                {op.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ STATS â”€â”€ */}
      <section className="bg-gray-950 py-14 md:py-20">
        <div className="max-w-6xl mx-auto px-5 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s, i) => (
            <div key={i}>
              <div className="font-display text-4xl md:text-6xl font-black text-white mb-2">
                <AnimatedCounter value={s.value} suffix={s.suffix} />
              </div>
              <div className="text-sm text-gray-400 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* â”€â”€ FEATURES â”€â”€ */}
      <section id="features" className="max-w-7xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="text-center mb-16">
          <SectionBadge text="8 Modules complets" />
          <h2 className="text-4xl md:text-5xl font-black mt-5 mb-4 text-gray-950 dark:text-white">
            Tout ce dont vous avez besoin,<br />dans une seule app
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-lg leading-relaxed">
            Chaque module est conÃ§u pour vous faire gagner du temps et de l'argent. Aucun abonnement requis pour commencer.
          </p>
        </div>

        <div className="space-y-6">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className={`rounded-3xl border overflow-hidden ${
                  i % 2 === 0
                    ? "bg-white dark:bg-gray-800/60 border-gray-100 dark:border-gray-700"
                    : "bg-gray-50/50 dark:bg-gray-900/60 border-gray-100 dark:border-gray-700"
                }`}
              >
                <div className="flex flex-col md:flex-row">
                  {/* Left */}
                  <div className="md:w-2/5 p-8 md:p-10 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-5">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ background: f.bg }}
                      >
                        <Icon className="w-7 h-7" style={{ color: f.color }} />
                      </div>
                      <span
                        className="text-xs font-black px-3 py-1 rounded-full"
                        style={{ background: "#dcfce7", color: "#15803d" }}
                      >
                        âœ“ {f.tag}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black mb-3 text-gray-950 dark:text-white">{f.title}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                  </div>

                  {/* Right â€” points */}
                  <div className="md:w-3/5 p-8 md:p-10 flex items-center" style={{ background: f.bg + "40" }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                      {f.points.map((pt, j) => (
                        <div
                          key={j}
                          className="flex items-start gap-3 bg-white/80 dark:bg-gray-800/80 rounded-2xl p-4 border border-white/50 dark:border-gray-700"
                        >
                          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: f.color }} />
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* â”€â”€ PHOTOS SECTION â”€â”€ */}
      <section className="max-w-7xl mx-auto px-5 md:px-8 pb-20">
        <div className="text-center mb-12">
          <SectionBadge text="Interface" color="#10b981" />
          <h2 className="text-3xl md:text-4xl font-black mt-5 mb-3 text-gray-950 dark:text-white">
            Une expÃ©rience pensÃ©e pour l'Afrique
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">Design moderne, rapide et optimisÃ© pour mobile.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-3xl overflow-hidden relative card-lift img-violet-border">
            <img
              src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&q=80"
              alt="Commerce Afrique"
              className="w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950/70 to-transparent flex items-end p-6">
              <div className="text-white">
                <p className="font-black text-lg">Boutique & Commerce</p>
                <p className="text-sm text-white/70">Vendez en ligne en quelques minutes</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl overflow-hidden relative card-lift img-violet-border">
            <img
              src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80"
              alt="Finance Mobile"
              className="w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950/70 to-transparent flex items-end p-6">
              <div className="text-white">
                <p className="font-black text-lg">Finances Mobile</p>
                <p className="text-sm text-white/70">GÃ©rez tout depuis votre tÃ©lÃ©phone</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl overflow-hidden relative card-lift img-violet-border">
            <img
              src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&q=80"
              alt="Transfert Argent"
              className="w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950/70 to-transparent flex items-end p-6">
              <div className="text-white">
                <p className="font-black">Transfert d'Argent</p>
                <p className="text-sm text-white/70">24 pays, Mobile Money</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl overflow-hidden relative card-lift img-violet-border">
            <img
              src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80"
              alt="Immobilier"
              className="w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950/70 to-transparent flex items-end p-6">
              <div className="text-white">
                <p className="font-black">MarchÃ© Immobilier</p>
                <p className="text-sm text-white/70">Achat, location, investissement</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl overflow-hidden relative card-lift img-violet-border">
            <img
              src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80"
              alt="Factures"
              className="w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950/70 to-transparent flex items-end p-6">
              <div className="text-white">
                <p className="font-black">Facturation Pro</p>
                <p className="text-sm text-white/70">PDF professionnels en 1 min</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ TRANSFERT â”€â”€ */}
      <section id="transfert" className="bg-gray-950 py-20 md:py-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <SectionBadge text="Transfert Africa" color="#0ea5e9" />
              <h2 className="text-4xl md:text-5xl font-black text-white mt-5 mb-5 leading-tight">
                Un continent,<br /><span style={{ color: "#38bdf8" }}>une infrastructure.</span>
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                Rechargez votre compte gratuitement via Mobile Money et envoyez de l'argent vers 24 pays africains avec seulement 3% de frais.
              </p>

              <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-3">âœ“ 24 pays Ã©ligibles</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6 max-h-64 overflow-y-auto pr-1">
                {COUNTRIES_ACTIVE.map((c) => (
                  <div key={c.name} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                    <span className="text-2xl">{c.flag}</span>
                    <div>
                      <p className="text-white font-bold text-sm">{c.name}</p>
                      <p className="text-gray-400 text-xs">{c.networks}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-bold px-7 py-3.5 rounded-2xl shadow-lg shadow-sky-500/30 hover:scale-105 transition-all"
              >
                AccÃ©der au Transfert <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-7 border border-white/10 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <img src={LOGO} alt="NEXORA" className="w-8 h-8 object-contain" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Nexora Transfert</p>
                    <p className="text-white font-black text-sm">Compte principal</p>
                  </div>
                </div>
                <div className="mb-6">
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Solde disponible</p>
                  <p className="text-4xl font-black text-white">
                    125 000 <span className="text-gray-400 text-xl">FCFA</span>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-emerald-500 rounded-xl py-3 text-center font-black text-white text-sm flex items-center justify-center gap-1.5">
                    <ArrowDownLeft className="w-4 h-4" /> Recharger
                  </div>
                  <div className="bg-white/10 border border-white/20 rounded-xl py-3 text-center font-black text-white text-sm flex items-center justify-center gap-1.5">
                    <Send className="w-4 h-4" /> Envoyer
                  </div>
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">DerniÃ¨res transactions</p>
                <div className="space-y-2">
                  {[
                    { flag: "ðŸ‡¸ðŸ‡³", pays: "SÃ©nÃ©gal", reseau: "Wave", montant: "20 000", t: "out" },
                    { flag: "ðŸ‡§ðŸ‡¯", pays: "Recharge", reseau: "MTN MoMo", montant: "50 000", t: "in" },
                    { flag: "ðŸ‡¨ðŸ‡®", pays: "CÃ´te d'Ivoire", reseau: "Orange Money", montant: "15 000", t: "out" },
                  ].map((tx, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5">
                      <span className="text-lg">{tx.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-bold">{tx.pays}</p>
                        <p className="text-gray-500 text-[11px]">{tx.reseau}</p>
                      </div>
                      <span className={`font-black text-xs ${tx.t === "in" ? "text-emerald-400" : "text-sky-300"}`}>
                        {tx.t === "in" ? "+" : "âˆ’"}
                        {tx.montant} FCFA
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -top-3 -right-3 bg-emerald-500 text-white px-4 py-2 rounded-2xl shadow-xl text-xs font-black">
                âœ“ Paiement sÃ©curisÃ©
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ ROADMAP â”€â”€ */}
      <section id="roadmap" className="max-w-7xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="text-center mb-14">
          <SectionBadge text="Roadmap publique" color="#8b5cf6" />
          <h2 className="text-4xl md:text-5xl font-black mt-5 mb-4 text-gray-950 dark:text-white">Ce qui arrive bientÃ´t</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-lg">
            NEXORA grandit avec vous. Voici ce que nous construisons pour vous.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ROADMAP.map((item, i) => (
            <div key={i} className="card-lift bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-7">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-700">
                  <Clock className="w-3 h-3" /> BientÃ´t
                </span>
              </div>
              <h3 className="text-xl font-black mb-2 text-gray-950 dark:text-white">{item.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-5">{item.desc}</p>
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 font-bold mb-2">
                <span>Progression</span>
                <span>{item.pct}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* â”€â”€ SÃ‰CURITÃ‰ â”€â”€ */}
      <section className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/40 dark:via-gray-900 dark:to-purple-950/30 py-20">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12">
            <SectionBadge text="SÃ©curitÃ© & Confiance" color="#10b981" />
            <h2 className="text-3xl md:text-4xl font-black mt-5 mb-4 text-gray-950 dark:text-white">
              Construit pour inspirer confiance
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
              Vos donnÃ©es et votre argent sont notre prioritÃ© absolue.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: ShieldCheck,
                color: "#10b981",
                title: "Chiffrement bout-en-bout",
                desc: "Toutes vos donnÃ©es financiÃ¨res et personnelles sont chiffrÃ©es (AES-256 au repos, TLS 1.3 en transit). Votre coffre-fort digital est inaccessible mÃªme pour nos Ã©quipes.",
              },
              {
                icon: Zap,
                color: "#6366f1",
                title: "99.9% de disponibilitÃ©",
                desc: "Infrastructure robuste hÃ©bergÃ©e sur des serveurs certifiÃ©s avec redondance et sauvegardes automatiques. NEXORA est disponible quand vous en avez besoin.",
              },
              {
                icon: Users,
                color: "#f59e0b",
                title: "DonnÃ©es vous appartiennent",
                desc: "Nous ne vendons jamais vos donnÃ©es. Exportez tout Ã  tout moment. Supprimez votre compte quand vous le souhaitez. Vous Ãªtes toujours en contrÃ´le.",
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-white dark:border-gray-700 shadow-lg text-center card-lift"
                >
                  <div
                    className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                    style={{ background: item.color + "20" }}
                  >
                    <Icon className="w-8 h-8" style={{ color: item.color }} />
                  </div>
                  <h3 className="font-black text-lg mb-3 text-gray-950 dark:text-white">{item.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* â”€â”€ AVIS â”€â”€ */}
      <section id="avis" className="max-w-7xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="text-center mb-14">
          <SectionBadge text="Avis utilisateurs" color="#f43f5e" />
          <h2 className="text-4xl md:text-5xl font-black mt-5 mb-4 text-gray-950 dark:text-white">
            Ce que disent<br />nos utilisateurs
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-lg">Des retours rÃ©els d'entrepreneurs africains.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
          {reviews.map((r, i) => (
            <div key={i} className="card-lift bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-7">
              <div className="flex gap-1 mb-4">
                {[...Array(r.stars)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-[15px] leading-relaxed mb-6 italic">"{r.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-black text-base flex-shrink-0 shadow-md">
                  {r.name.charAt(0)}
                </div>
                <div>
                  <p className="font-black text-sm text-gray-900 dark:text-white">{r.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{r.country}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Formulaire d'avis */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/40 border border-indigo-100 dark:border-indigo-800 rounded-3xl p-8 md:p-10 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg text-gray-950 dark:text-white">Partagez votre avis</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Votre retour aide d'autres utilisateurs</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">Note *</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} type="button" onClick={() => setReviewForm((p) => ({ ...p, stars: s }))}>
                    <Star
                      className={`w-6 h-6 ${s <= reviewForm.stars ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-gray-600"}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Nom complet *{" "}
                  <span className="normal-case font-normal text-gray-400">(prÃ©nom + nom requis)</span>
                </label>
                <input
                  type="text"
                  value={reviewForm.name}
                  onChange={(e) => setReviewForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex : Kouassi Jean"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">Pays</label>
                <input
                  type="text"
                  value={reviewForm.country}
                  onChange={(e) => setReviewForm((p) => ({ ...p, country: e.target.value }))}
                  placeholder="Ex : ðŸ‡§ðŸ‡¯ BÃ©nin"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">Votre avis *</label>
              <textarea
                rows={4}
                value={reviewForm.text}
                onChange={(e) => setReviewForm((p) => ({ ...p, text: e.target.value }))}
                placeholder="Partagez votre expÃ©rience avec NEXORA..."
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all resize-none"
              />
            </div>

            <button
              onClick={submitReview}
              disabled={
                reviewForm.name.trim().split(/\s+/).length < 2 ||
                !reviewForm.name.trim().split(/\s+/)[1] ||
                !reviewForm.text
              }
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Star className="w-4 h-4 fill-white" /> Publier mon avis
            </button>
          </div>
        </div>
      </section>

      {/* â”€â”€ FAQ â”€â”€ */}
      <section id="faq" className="max-w-4xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="text-center mb-14">
          <SectionBadge text="Questions frÃ©quentes" color="#6366f1" />
          <h2 className="text-4xl md:text-5xl font-black mt-5 mb-4 text-gray-950 dark:text-white">
            Tout ce que vous<br />devez savoir
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-lg">
            Retrouvez les rÃ©ponses aux questions les plus posÃ©es sur NEXORA.
          </p>
        </div>
        <div className="space-y-3">
          {[
            {
              q: "NEXORA est-il gratuit ?",
              a: "Oui, l'inscription est 100% gratuite et sans carte bancaire. Vous pouvez accÃ©der Ã  la plupart des modules gratuitement. Certaines fonctionnalitÃ©s avancÃ©es nÃ©cessitent un abonnement Premium.",
            },
            {
              q: "Comment fonctionne le Transfert d'Argent Africa ?",
              a: "Rechargez votre compte NEXORA via Mobile Money (MTN, Orange, Moovâ€¦) pour seulement 100 FCFA de frais. Ensuite, transfÃ©rez vers n'importe lequel des 24 pays actifs avec 3% de frais seulement. Une facture PDF est gÃ©nÃ©rÃ©e automatiquement.",
            },
            {
              q: "Qu'est-ce que la fonctionnalitÃ© Contacts WhatsApp ?",
              a: "Cette fonctionnalitÃ© vous permet d'accÃ©der aux contacts WhatsApp des membres NEXORA. Vous pouvez les tÃ©lÃ©charger au format .vcf (vCard) et les importer directement dans votre tÃ©lÃ©phone. IdÃ©al pour agrandir votre rÃ©seau professionnel en Afrique.",
            },
            {
              q: "Mes donnÃ©es sont-elles sÃ©curisÃ©es ?",
              a: "Absolument. NEXORA utilise un chiffrement AES-256 pour les donnÃ©es au repos et TLS 1.3 pour les donnÃ©es en transit. Votre coffre-fort digital est inaccessible mÃªme pour nos Ã©quipes. Vos donnÃ©es vous appartiennent.",
            },
            {
              q: "Dans quels pays NEXORA est-il disponible ?",
              a: "NEXORA est disponible partout, mais le service Transfert couvre 24 pays africains : BÃ©nin, CÃ´te d'Ivoire, Togo, SÃ©nÃ©gal, Mali, Burkina Faso, Cameroun, Ghana, NigÃ©ria, Kenya, Tanzanie, Ouganda, Rwanda, GuinÃ©e, RD Congo, Gabon, Congo, Maroc, Gambie, Sierra Leone, Liberia, Mozambique, Zambie et Niger...",
            },
            {
              q: "Comment crÃ©er des factures PDF professionnelles ?",
              a: "Depuis le module Facturation, remplissez les informations de votre client et vos services, puis gÃ©nÃ©rez votre facture PDF en un clic. Le document est personnalisÃ© avec votre branding et numÃ©rotÃ© automatiquement.",
            },
            {
              q: "Comment fonctionne la boutique e-commerce ?",
              a: "La boutique NEXORA vous permet de vendre vos produits physiques en ligne. CrÃ©ez votre vitrine publique, ajoutez vos produits avec photos et descriptions, dÃ©finissez vos prix et modes de paiement, et gÃ©rez vos commandes facilement.",
            },
            {
              q: "Comment contacter le support ?",
              a: "Vous pouvez nous joindre par email Ã  support@nexora.africa. Notre Ã©quipe rÃ©pond dans les meilleurs dÃ©lais. Vous pouvez aussi utiliser le chat intÃ©grÃ© Ã  la plateforme une fois connectÃ©.",
            },
            {
              q: "Comment fonctionne le marchÃ© immobilier ?",
              a: "Publiez et dÃ©couvrez des biens immobiliers dans toute l'Afrique : maisons, appartements, terrains, bureaux. Ajoutez des photos HD, dÃ©finissez votre prix et recevez des contacts directs d'acheteurs ou locataires intÃ©ressÃ©s.",
            },
            {
              q: "Y a-t-il une application mobile ?",
              a: "NEXORA est une application web progressive (PWA) optimisÃ©e pour mobile. Vous pouvez l'ajouter Ã  votre Ã©cran d'accueil comme une application native et l'utiliser hors ligne pour certaines fonctionnalitÃ©s.",
            },
            {
              q: "Comment passer au plan Premium ?",
              a: "Rendez-vous dans la section Abonnement depuis votre tableau de bord. Choisissez le plan qui vous convient (Boss ou Roi) et payez via Mobile Money. Votre compte est activÃ© instantanÃ©ment avec un badge bleu vÃ©rifiÃ©.",
            },
          ].map((item, i) => (
            <FAQItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>
      </section>

      {/* â”€â”€ TÃ‰LÃ‰CHARGER L'APP â”€â”€ */}
      <section id="download" className="max-w-7xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="relative bg-gray-950 rounded-3xl overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-green-500/10 blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl" />
          </div>

          <div className="relative flex flex-col md:flex-row items-center gap-12 px-8 md:px-16 py-16 md:py-20">
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30 text-xs font-black text-green-400 mb-6 uppercase tracking-widest">
                <span>ðŸ“±</span> Application Mobile
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white mb-5 leading-tight">
                Nexora dans<br />votre poche
              </h2>
              <p className="text-gray-400 text-lg mb-8 max-w-md">
                TÃ©lÃ©chargez l'application Android directement â€” sans passer par le Play Store. Installez-la en quelques secondes sur votre tÃ©lÃ©phone.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                {/* CORRECTION : icÃ´ne SVG Android corrigÃ©e avec le vrai logo Android */}
                <a
                  href="https://github.com/SYSTEME3E/cozy-data-place/releases/download/v1.0/nexora.apk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 bg-green-500 hover:bg-green-400 text-white font-black px-8 py-4 rounded-2xl text-base transition-all shadow-lg shadow-green-500/25 hover:scale-105 active:scale-95"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.523 2.764a.5.5 0 0 0-.694-.13L13.5 4.764a8.51 8.51 0 0 0-3 0L7.171 2.634a.5.5 0 0 0-.694.13C5.24 4.08 4.5 5.96 4.5 8c0 .276.224.5.5.5h14c.276 0 .5-.224.5-.5 0-2.04-.74-3.92-1.977-5.236zM9.5 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm5 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM4.5 9.5A.5.5 0 0 0 4 10v7a2.5 2.5 0 0 0 5 0v-1h2v1a2.5 2.5 0 0 0 5 0v-7a.5.5 0 0 0-.5-.5h-11zm1 1h1v3.5a1 1 0 0 1-2 0V11a.5.5 0 0 1 .5-.5h.5zm11 0h.5a.5.5 0 0 1 .5.5v3.5a1 1 0 0 1-2 0V10.5h1z"/>
                  </svg>
                  TÃ©lÃ©charger pour Android
                  <span className="text-xs font-medium opacity-75">(.apk)</span>
                </a>

                <button
                  onClick={() => {
                    const el = document.getElementById("ios-instructions");
                    if (el) el.classList.toggle("hidden");
                  }}
                  className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all hover:scale-105 active:scale-95"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  Installer sur iPhone
                </button>
              </div>

              <div id="ios-instructions" className="hidden mt-6 p-5 bg-white/5 border border-white/10 rounded-2xl text-left max-w-md">
                <p className="text-white font-bold mb-3 text-sm">ðŸ“² Comment installer sur iPhone :</p>
                <ol className="text-gray-400 text-sm space-y-2 list-decimal list-inside">
                  <li>Ouvrez ce site dans <strong className="text-white">Safari</strong></li>
                  <li>Appuyez sur le bouton <strong className="text-white">Partager</strong> â†‘ en bas</li>
                  <li>Choisissez <strong className="text-green-400">Â« Sur l'Ã©cran d'accueil Â»</strong></li>
                  <li>Appuyez sur <strong className="text-white">Ajouter</strong></li>
                </ol>
              </div>

              <div className="mt-8 flex flex-wrap gap-4 justify-center md:justify-start">
                {[
                  { emoji: "ðŸ”’", label: "100% sÃ©curisÃ©" },
                  { emoji: "âš¡", label: "Installation rapide" },
                  { emoji: "ðŸ†“", label: "Gratuit" },
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-500 text-sm">
                    <span>{b.emoji}</span> {b.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Mockup tÃ©lÃ©phone */}
            <div className="flex-shrink-0 flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-green-500/20 blur-3xl scale-150" />
                <div className="relative w-48 h-80 bg-gray-800 rounded-[2.5rem] border-4 border-gray-700 shadow-2xl flex flex-col overflow-hidden">
                  <div className="bg-gray-900 h-8 flex items-center justify-center">
                    <div className="w-16 h-1.5 bg-gray-700 rounded-full" />
                  </div>
                  <div className="flex-1 bg-[#0a0e27] flex flex-col items-center justify-center gap-3 p-4">
                    <img src={LOGO} alt="Nexora" className="w-16 h-16 object-contain drop-shadow-lg" />
                    <p className="text-white font-black text-lg tracking-widest">NEXORA</p>
                    <p className="text-green-400 text-xs font-medium">Gestion financiÃ¨re</p>
                    <div className="w-full bg-green-500/20 border border-green-500/30 rounded-xl p-2 mt-2">
                      <p className="text-green-400 text-[10px] font-bold text-center">âœ“ Application installÃ©e</p>
                    </div>
                  </div>
                  <div className="bg-gray-900 h-6 flex items-center justify-center">
                    <div className="w-20 h-1 bg-gray-600 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ CTA FINAL â”€â”€ */}
      <section className="max-w-7xl mx-auto px-5 md:px-8 pb-20">
        <div className="relative bg-gray-950 rounded-3xl overflow-hidden py-16 md:py-24 px-8 md:px-16 text-center">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 left-1/4 w-72 h-72 rounded-full bg-indigo-600/20 blur-3xl" />
            <div className="absolute -bottom-20 right-1/4 w-72 h-72 rounded-full bg-purple-600/20 blur-3xl" />
          </div>
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs font-black text-white mb-8 uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Inscription gratuite Â· Sans carte bancaire
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-white mb-5 leading-tight">
              PrÃªt Ã  transformer<br />votre gestion financiÃ¨re ?
            </h2>
            <p className="text-gray-400 text-lg max-w-lg mx-auto mb-10">
              Rejoignez des milliers d'entrepreneurs africains qui font confiance Ã  NEXORA chaque jour.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-2 bg-white text-gray-950 font-black px-10 py-4 rounded-2xl text-lg hover:bg-gray-100 transition-all shadow-2xl hover:scale-105 active:scale-95"
            >
              Commencer maintenant <ArrowRight className="w-5 h-5" />
            </button>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
              {[
                { icon: ShieldCheck, label: "100% sÃ©curisÃ©" },
                { icon: Globe, label: "Plusieurs pays Ã©ligibles" },
                { icon: Users, label: "Inscription gratuite" },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                    <Icon className="w-4 h-4" /> {item.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ FOOTER â”€â”€ */}
      <footer className="bg-gray-950 text-gray-400">
        <div className="max-w-7xl mx-auto px-5 md:px-8 pt-14 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img src={LOGO} alt="NEXORA" className="w-10 h-10 object-contain" />
                <span className="font-display text-xl font-black text-white tracking-tight">NEXORA</span>
              </div>
              <p className="text-sm leading-relaxed mb-4 text-gray-500">Plateforme financiÃ¨re tout-en-un pour l'Afrique.</p>
              <div className="flex items-center gap-3">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#1877F2] flex items-center justify-center transition-all hover:scale-110"
                >
                  <Facebook className="w-4 h-4 text-white" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-black flex items-center justify-center transition-all hover:scale-110"
                >
                  <Twitter className="w-4 h-4 text-white" />
                </a>
              </div>
            </div>

            <div>
              <p className="text-white font-black text-sm mb-4 uppercase tracking-wider">Modules</p>
              <div className="flex flex-col gap-2">
                {["Finances", "Facturation", "Boutique", "Transfert", "Immobilier", "Coffre-Fort", "Contacts WhatsApp", "Liens"].map((l) => (
                  <button key={l} onClick={() => navigate("/login")} className="text-sm text-gray-500 hover:text-white text-left transition-colors">
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-white font-black text-sm mb-4 uppercase tracking-wider">Ressources</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => navigate("/login")} className="text-sm text-gray-500 hover:text-white text-left transition-colors">Connexion</button>
                <button onClick={() => navigate("/login")} className="text-sm text-gray-500 hover:text-white text-left transition-colors">CrÃ©er un compte</button>
                <button onClick={() => scrollTo("avis")} className="text-sm text-gray-500 hover:text-white text-left transition-colors">TÃ©moignages</button>
                <a href="mailto:support@nexora.africa" className="text-sm text-gray-500 hover:text-white text-left transition-colors">Support</a>
              </div>
            </div>

            <div>
              <p className="text-white font-black text-sm mb-4 uppercase tracking-wider">LÃ©gal</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => navigate("/cgu")} className="text-sm text-gray-500 hover:text-white text-left transition-colors">CGU</button>
                <button onClick={() => navigate("/confidentialite")} className="text-sm text-gray-500 hover:text-white text-left transition-colors">ConfidentialitÃ©</button>
              </div>
              <div className="mt-4">
                <p className="text-white font-black text-xs mb-2 uppercase tracking-wider">Pays actifs</p>
                <div className="flex flex-wrap gap-1.5">
                  {["ðŸ‡§ðŸ‡¯", "ðŸ‡¨ðŸ‡®", "ðŸ‡¹ðŸ‡¬", "ðŸ‡¸ðŸ‡³", "ðŸ‡³ðŸ‡ª", "ðŸ‡§ðŸ‡«", "ðŸ‡¨ðŸ‡²", "ðŸ‡¨ðŸ‡©..."].map((f, i) => (
                    <span key={i} className="text-lg">{f}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-600">Â© {new Date().getFullYear()} NEXORA. Tous droits rÃ©servÃ©s.</p>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <button onClick={() => navigate("/cgu")} className="hover:text-white transition-colors">CGU</button>
              <button onClick={() => navigate("/confidentialite")} className="hover:text-white transition-colors">ConfidentialitÃ©</button>
              <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> SÃ©curisÃ©</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

