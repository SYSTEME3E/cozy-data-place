import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { initTheme, toggleTheme } from "@/lib/theme";
import {
  ArrowRight, Zap, ShieldCheck, Globe, BarChart3, Receipt,
  Store, Lock, Send, Star, TrendingUp,
  CreditCard, Wallet, ChevronDown, Menu, X, Sparkles,
  Users, ArrowDownLeft, Facebook, Twitter,
  CheckCircle2, Clock, Play, MessageSquare, Sun, Moon,
  GraduationCap, QrCode, Home,
} from "lucide-react";

const LOGO = "https://i.postimg.cc/c1QgbZsG/ei_1773937801458_removebg_preview.png";

const OPERATORS = [
  { name: "MTN MoMo" }, { name: "Orange Money" }, { name: "Moov Money" },
  { name: "Wave" }, { name: "M-Pesa" }, { name: "Airtel Money" },
  { name: "Flooz" }, { name: "T-Money" }, { name: "Free Money" },
];

const FEATURES = [
  { icon: BarChart3, color: "#305CDE", bg: "#e8f0fe", title: "Gestion Financière", tag: "Disponible", desc: "Pilotez vos finances avec précision. Enregistrez vos entrées d'argent, suivez vos dépenses par catégorie, consultez votre historique complet et visualisez votre évolution financière.", points: ["Tableau de bord en temps réel", "Catégorisation automatique", "Export PDF & Excel", "Rapports mensuels"] },
  { icon: Receipt, color: "#10b981", bg: "#ecfdf5", title: "Facturation Professionnelle", tag: "Disponible", desc: "Créez des factures PDF magnifiques et professionnelles en moins d'une minute. Ajoutez vos informations fiscales, et téléchargez ou partagez instantanément.", points: ["PDF haute qualité", "Branding personnalisé", "Numérotation automatique", "Archivage illimité"] },
  { icon: Store, color: "#f43f5e", bg: "#fff1f2", title: "Boutique E-commerce", tag: "Disponible", desc: "Lancez votre boutique en ligne en quelques clics. Publiez vos produits physiques ou digitaux, gérez votre catalogue, suivez vos commandes et encaissez vos paiements.", points: ["Vitrine publique personnalisée", "Gestion des stocks", "Suivi des commandes", "Produits digitaux & physiques"] },
  { icon: Send, color: "#0ea5e9", bg: "#f0f9ff", title: "Transfert d'Argent Africa", tag: "Disponible", desc: "Envoyez de l'argent partout en Afrique via Mobile Money en quelques secondes. Rechargez pour 100 FCFA de frais, transférez vers 24 pays actifs avec seulement 3% de frais.", points: ["100 FCFA de frais rechargement", "24 pays actifs", "3% de frais seulement", "Facture PDF automatique"] },
  { icon: CreditCard, color: "#06b6d4", bg: "#ecfeff", title: "Nexora PayLink", tag: "Disponible", desc: "Créez des liens de paiement Mobile Money en quelques secondes. Partagez-les par WhatsApp ou QR code. Vos clients paient directement sans avoir besoin d'un compte NEXORA.", points: ["Lien de paiement en 1 clic", "QR Code intégré", "24 pays Mobile Money", "Statistiques de paiement"] },
  { icon: GraduationCap, color: "#f59e0b", bg: "#fffbeb", title: "Formations", tag: "Disponible", desc: "Accédez à des formations exclusives conçues pour les entrepreneurs africains. Vidéos, PDF, stratégies business — tout pour développer vos compétences.", points: ["Formations vidéo & PDF", "Contenu exclusif", "Accès illimité", "Mises à jour régulières"] },
  { icon: Sparkles, color: "#ec4899", bg: "#fef2f2", title: "Nexora Academy", tag: "Disponible", desc: "Contenu exclusif pour les membres NEXORA. Tutoriels, stratégies business et formations pratiques pour entrepreneurs africains. Accès illimité inclus.", points: ["Contenu exclusif membres", "Mises à jour régulières", "Accès illimité", "Stratégies business Africa"] },
  { icon: Home, color: "#3b82f6", bg: "#eff6ff", title: "Marché Immobilier", tag: "Disponible", desc: "Publiez et découvrez des biens immobiliers dans toute l'Afrique. Maisons, appartements, terrains, bureaux – achat ou location, contact direct sécurisé.", points: ["Annonces illimitées", "Profil vendeur vérifié", "Photos HD", "Contact direct sécurisé"] },
  { icon: Lock, color: "#14b8a6", bg: "#f0fdfa", title: "Coffre-Fort Digital", tag: "Disponible", desc: "Stockez en sécurité tous vos mots de passe, identifiants et informations sensibles. Chiffrement bout-en-bout, accès protégé par PIN personnel.", points: ["Chiffrement AES-256", "Mots de passe illimités", "Accès PIN sécurisé", "Catégories personnalisées"] },
  { icon: Users, color: "#25d366", bg: "#f0fdf4", title: "Contacts WhatsApp", tag: "Disponible", desc: "Accédez aux contacts WhatsApp des membres NEXORA. Téléchargez-les en format .vcf pour les importer directement dans votre téléphone. Réseau de confiance, membres vérifiés.", points: ["Contacts membres vérifiés", "Export .vcf (vCard)", "Import direct sur mobile", "Réseau de confiance"] },
  { icon: Wallet, color: "#64748b", bg: "#f8fafc", title: "Abonnements & Liens", tag: "Disponible", desc: "Gérez tous vos abonnements en un seul endroit. Créez des liens courts personnalisés pour partager vos réseaux, boutiques et contacts facilement.", points: ["Suivi de tous vos abonnements", "Alertes renouvellement", "Liens courts personnalisés", "Partage facile"] },
];

const ROADMAP = [
  { title: "Carte NEXORA Virtuelle", desc: "Payez partout dans le monde avec votre carte virtuelle NEXORA. Compatible avec les paiements en ligne internationaux.", pct: 65 },
  { title: "Wallet Multi-devises", desc: "Gérez XOF, GHS, NGN, KES et d'autres devises africaines depuis un seul portefeuille unifié.", pct: 40 },
  { title: "NEXORA Business", desc: "Tableau de bord entreprise avec multi-utilisateurs, rôles, permissions et reporting avancé.", pct: 20 },
 
];

const STATS = [
  { value: "24", label: "Pays éligibles pour le service du Transfert", suffix: "" },
  { value: "12", label: "Modules intégrés & actifs", suffix: "+" },
  { value: "99.9", label: "Disponibilité", suffix: "%" },
  { value: "0", label: "Frais d'inscription", suffix: " FCFA" },
];

const COUNTRIES_ACTIVE = [
  { flag: "🇧🇯", name: "Bénin", networks: "MTN · Moov" },
  { flag: "🇨🇮", name: "Côte d'Ivoire", networks: "Orange · MTN · Wave" },
  { flag: "🇹🇬", name: "Togo", networks: "Flooz · T-Money" },
  { flag: "🇸🇳", name: "Sénégal", networks: "Orange · Wave · Free" },
  { flag: "🇳🇪", name: "Niger", networks: "Airtel · Moov" },
  { flag: "🇲🇱", name: "Mali", networks: "Orange · Moov · Wave" },
  { flag: "🇧🇫", name: "Burkina Faso", networks: "Orange · Moov" },
  { flag: "🇨🇲", name: "Cameroun", networks: "MTN · Orange" },
  { flag: "🇬🇭", name: "Ghana", networks: "MTN · Vodafone · AirtelTigo" },
  { flag: "🇳🇬", name: "Nigéria", networks: "MTN · Airtel · Glo" },
  { flag: "🇰🇪", name: "Kenya", networks: "M-Pesa · Airtel" },
  { flag: "🇹🇿", name: "Tanzanie", networks: "M-Pesa · Tigo" },
  { flag: "🇺🇬", name: "Ouganda", networks: "MTN · Airtel" },
  { flag: "🇷🇼", name: "Rwanda", networks: "MTN · Airtel" },
  { flag: "🇬🇳", name: "Guinée", networks: "Orange · MTN" },
  { flag: "🇨🇩", name: "RD Congo", networks: "Vodacom · Airtel" },
  { flag: "🇬🇦", name: "Gabon", networks: "Airtel · MTN" },
  { flag: "🇨🇬", name: "Congo", networks: "MTN · Airtel" },
  { flag: "🇲🇦", name: "Maroc", networks: "Orange · Maroc Telecom" },
  { flag: "🇬🇲", name: "Gambie", networks: "Africell · QCell" },
  { flag: "🇸🇱", name: "Sierra Leone", networks: "Orange · Africell" },
  { flag: "🇱🇷", name: "Liberia", networks: "MTN · Lonestar" },
  { flag: "🇲🇿", name: "Mozambique", networks: "M-Pesa · Airtel" },
  { flag: "🇿🇲", name: "Zambie", networks: "MTN · Airtel" },
];

function SectionBadge({ text, color = "#305CDE" }: { text: string; color?: string }) {
  return (
    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest" style={{ background: color + "20", color, border: `1px solid ${color}35` }}>
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
    const obs = new IntersectionObserver(([e]) => {
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
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [value]);
  return <span ref={ref}>{display}{suffix}</span>;
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${open ? "border-[#305CDE]/40 dark:border-[#305CDE]/40 bg-[#305CDE]/5 dark:bg-[#305CDE]/10" : "border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800"}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-5 text-left gap-4">
        <span className="font-black text-[15px] text-gray-900 dark:text-white">{question}</span>
        <ChevronDown className={`w-5 h-5 flex-shrink-0 text-[#305CDE] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-6 pb-5"><p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{answer}</p></div>}
    </div>
  );
}

function WhatsAppFloat({ phone }: { phone: string }) {
  const [visible, setVisible] = useState(false);
  const [pulse, setPulse] = useState(true);
  const url = `https://wa.me/${phone}?text=${encodeURIComponent("Bonjour NEXORA 👋 J'ai besoin d'aide")}`;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 2000);
    const p = setTimeout(() => setPulse(false), 8000);
    return () => { clearTimeout(t); clearTimeout(p); };
  }, []);

  return (
    <>
      <style>{`
        @keyframes wa-in{from{opacity:0;transform:translateY(20px) scale(.8)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes wa-ripple{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.2);opacity:0}}
        .wa-btn{animation:wa-in .45s cubic-bezier(.34,1.56,.64,1) forwards;}
        .wa-ripple{animation:wa-ripple 1.6s ease-out infinite;}
        .wa-tooltip{opacity:0;transform:translateX(12px);transition:all .25s ease;pointer-events:none;}
        .wa-wrap:hover .wa-tooltip{opacity:1;transform:translateX(0);}
      `}</style>
      <div
        className={`fixed bottom-6 right-5 z-50 flex items-center gap-3 wa-wrap transition-all duration-500 ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        {/* Tooltip */}
        <div className="wa-tooltip flex flex-col items-end">
          <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-bold px-3 py-2 rounded-2xl rounded-br-sm shadow-xl border border-gray-100 dark:border-gray-700 whitespace-nowrap max-w-[170px] leading-snug">
            Une question ? On répond<br />
            <span className="text-[#25d366] font-black">sur WhatsApp 🇧🇯</span>
          </div>
          <div className="w-2.5 h-2.5 bg-white dark:bg-gray-900 border-r border-b border-gray-100 dark:border-gray-700 rotate-45 mr-4 -mt-1.5 shadow-sm" />
        </div>

        {/* Button */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="wa-btn relative flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-transform hover:scale-110 active:scale-95"
          style={{ background: "linear-gradient(135deg, #25d366, #128c7e)" }}
          aria-label="Contacter le support NEXORA sur WhatsApp"
        >
          {/* Ripple */}
          {pulse && (
            <>
              <span className="wa-ripple absolute inset-0 rounded-full" style={{ background: "#25d366", animationDelay: "0s" }} />
              <span className="wa-ripple absolute inset-0 rounded-full" style={{ background: "#25d366", animationDelay: ".6s" }} />
            </>
          )}
          {/* WhatsApp SVG icon */}
          <svg viewBox="0 0 32 32" fill="white" className="w-7 h-7 relative z-10" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.002 3C9.374 3 4 8.373 4 15.001c0 2.125.559 4.197 1.621 6.018L4 29l8.187-1.595A12.95 12.95 0 0 0 16.002 28C22.628 28 28 22.627 28 16S22.628 3 16.002 3zm0 23.6a10.893 10.893 0 0 1-5.567-1.527l-.399-.237-4.138.806.842-4.04-.261-.418A10.894 10.894 0 0 1 5.1 15.001C5.1 8.98 9.98 4.1 16.002 4.1 22.02 4.1 26.9 8.98 26.9 15S22.02 26.6 16.002 26.6zm5.97-8.186c-.328-.164-1.94-.957-2.24-1.066-.3-.11-.519-.164-.738.164-.218.328-.847 1.066-1.039 1.285-.19.22-.382.247-.71.082-.328-.164-1.384-.51-2.636-1.627-.974-.87-1.632-1.944-1.822-2.272-.192-.328-.02-.505.143-.668.147-.147.328-.383.492-.574.164-.192.218-.328.328-.547.109-.219.054-.41-.027-.574-.082-.164-.738-1.778-1.012-2.435-.266-.638-.537-.552-.738-.562l-.629-.01c-.219 0-.574.082-.874.41-.3.328-1.148 1.121-1.148 2.735s1.175 3.172 1.339 3.39c.164.22 2.312 3.528 5.604 4.948.784.338 1.394.54 1.87.692.786.25 1.501.215 2.066.13.63-.094 1.94-.793 2.213-1.559.274-.766.274-1.421.192-1.56-.082-.137-.3-.219-.629-.382z"/>
          </svg>
        </a>
      </div>
    </>
  );
}

function AIHeroSection({ onCTA }: { onCTA: () => void }) {
  const [inputText, setInputText] = useState("");
  const [phase, setPhase] = useState<"idle" | "typing" | "generating" | "done">("idle");
  const [generatedDesc, setGeneratedDesc] = useState("");
  const [charCount, setCharCount] = useState(0);
  const demoProduct = "Sac à main cuir marron artisanal";
  const demoOutput = `✨ Élégance et authenticité se rencontrent dans ce sac à main en cuir véritable, confectionné à la main par des artisans locaux. Ses finitions soignées, ses coutures renforcées et sa teinte caramel chaleureuse en font un accessoire incontournable. Idéal pour le bureau, les sorties en ville ou les occasions spéciales. Dimensions : 35×25 cm. Livraison disponible partout en Afrique.`;

  const runDemo = () => {
    if (phase !== "idle") return;
    setPhase("typing");
    setInputText("");
    setGeneratedDesc("");
    setCharCount(0);
    let i = 0;
    const typeInterval = setInterval(() => {
      i++;
      setInputText(demoProduct.slice(0, i));
      if (i >= demoProduct.length) {
        clearInterval(typeInterval);
        setTimeout(() => {
          setPhase("generating");
          setTimeout(() => {
            setPhase("done");
            let j = 0;
            const writeInterval = setInterval(() => {
              j += 3;
              const slice = demoOutput.slice(0, j);
              setGeneratedDesc(slice);
              setCharCount(slice.length);
              if (j >= demoOutput.length) {
                setGeneratedDesc(demoOutput);
                setCharCount(demoOutput.length);
                clearInterval(writeInterval);
                setTimeout(() => setPhase("idle"), 5000);
              }
            }, 18);
          }, 1400);
        }, 400);
      }
    }, 55);
  };

  return (
    <section className="relative overflow-hidden bg-[#020817] py-20 md:py-28">
      <style>{`
        @keyframes glow-pulse{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes scan-line{0%{transform:translateY(-100%)}100%{transform:translateY(400%)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        .ai-cursor{display:inline-block;width:2px;height:1em;background:#305CDE;margin-left:1px;animation:blink 1s steps(1) infinite;vertical-align:text-bottom;}
        @keyframes token-fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .token-in{animation:token-fade .15s ease forwards;}
        @keyframes progress-fill{from{width:0%}to{width:100%}}
        .progress-bar{animation:progress-fill 1.3s ease forwards;}
        @keyframes shimmer-ai{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .shimmer-text{background:linear-gradient(90deg,#305CDE,#a855f7,#ec4899,#305CDE);background-size:200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer-ai 3s linear infinite;}
      `}</style>

      {/* Background glow blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full opacity-20" style={{ background: "radial-gradient(ellipse, #305CDE 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: "radial-gradient(ellipse, #ec4899 0%, transparent 70%)" }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 md:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6" style={{ background: "#305CDE15", color: "#6B8FE8", border: "1px solid #305CDE30" }}>
            <Sparkles className="w-3.5 h-3.5" />
            Intelligence Artificielle · Nouveau
          </span>
          <h2 className="text-4xl md:text-6xl font-black text-white leading-[1.05] mb-5">
            Vos descriptions produit,<br />
            <span className="shimmer-text">rédigées par l'IA en 3 secondes.</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Décrivez votre produit en quelques mots. L'assistant IA de NEXORA génère automatiquement une fiche produit convaincante, optimisée pour vendre — en français, adapté au marché africain.
          </p>
        </div>

        {/* Main mockup + benefits grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* LEFT: interactive mockup */}
          <div className="relative">
            {/* Browser chrome */}
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ background: "#0d1117" }}>
              {/* Title bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10" style={{ background: "#161b22" }}>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                </div>
                <div className="flex-1 mx-3 bg-white/5 border border-white/10 rounded-md px-3 py-1 text-[11px] text-gray-500 font-mono">nexora.app · Assistant IA · Description Produit</div>
                <div className="w-4 h-4 rounded-sm" style={{ background: "#305CDE20" }}>
                  <Sparkles className="w-3 h-3 text-[#305CDE] m-0.5" />
                </div>
              </div>

              {/* App UI */}
              <div className="p-5 space-y-4">
                {/* Top bar inside app */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#305CDE20" }}><Sparkles className="w-4 h-4 text-[#305CDE]" /></div>
                    <span className="text-white font-black text-sm">AIDescriptionHelper</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "#10b98120", color: "#10b981" }}>✓ Actif</span>
                </div>

                {/* Input field */}
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Nom du produit</label>
                  <div className="relative flex items-center bg-white/5 border rounded-xl px-4 py-3 gap-3 transition-all" style={{ borderColor: phase === "typing" ? "#305CDE" : "#ffffff15" }}>
                    <Store className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-sm text-white font-medium flex-1 min-h-[20px]">
                      {inputText || <span className="text-gray-600">Ex: Sac à main cuir marron artisanal…</span>}
                      {phase === "typing" && <span className="ai-cursor" />}
                    </span>
                  </div>
                </div>

                {/* Generate button */}
                <button
                  onClick={runDemo}
                  disabled={phase !== "idle"}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
                  style={{
                    background: phase !== "idle" ? "#305CDE40" : "linear-gradient(135deg, #305CDE, #1E3FA8)",
                    color: phase !== "idle" ? "#305CDE" : "white",
                    cursor: phase !== "idle" ? "not-allowed" : "pointer",
                  }}
                >
                  {phase === "generating" ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-[#305CDE] border-t-transparent animate-spin" />
                      L'IA rédige votre description…
                    </>
                  ) : phase === "done" ? (
                    <><CheckCircle2 className="w-4 h-4" /> Description générée !</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Générer avec l'IA</>
                  )}
                </button>

                {/* Progress bar during generating */}
                {phase === "generating" && (
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="progress-bar h-full rounded-full" style={{ background: "linear-gradient(90deg, #305CDE, #a855f7)" }} />
                  </div>
                )}

                {/* Output */}
                {(phase === "done" || generatedDesc) && (
                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#305CDE30", background: "#305CDE08" }}>
                    <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "#305CDE20", background: "#305CDE12" }}>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#305CDE]" />
                        <span className="text-[11px] font-black text-[#6B8FE8] uppercase tracking-wider">Description générée</span>
                      </div>
                      <span className="text-[10px] text-gray-500">{charCount} caractères</span>
                    </div>
                    <div className="p-4">
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {generatedDesc}
                        {phase === "done" && generatedDesc.length < demoOutput.length && <span className="ai-cursor" />}
                      </p>
                    </div>
                    {phase === "done" && generatedDesc === demoOutput && (
                      <div className="px-4 pb-3 flex gap-2">
                        <button className="flex-1 py-2 rounded-lg text-xs font-bold transition-colors" style={{ background: "#10b98115", color: "#10b981", border: "1px solid #10b98130" }}>
                          ✓ Utiliser cette description
                        </button>
                        <button className="px-3 py-2 rounded-lg text-xs font-bold transition-colors" style={{ background: "#305CDE15", color: "#6B8FE8", border: "1px solid #305CDE30" }}>
                          ↺ Régénérer
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Idle state hint */}
                {phase === "idle" && !generatedDesc && (
                  <button onClick={runDemo} className="w-full py-2 rounded-lg text-xs font-medium text-gray-600 hover:text-[#305CDE] transition-colors border border-white/5 hover:border-[#305CDE]/30">
                    ▶ Voir la démo en direct
                  </button>
                )}
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-4 -right-4 hidden md:flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-2xl border" style={{ background: "#0d1117", borderColor: "#10b98130" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#10b98120" }}>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-white text-xs font-black">+67% de clics</p>
                <p className="text-gray-500 text-[10px]">avec des descriptions IA</p>
              </div>
            </div>
          </div>

          {/* RIGHT: benefits */}
          <div className="flex flex-col gap-5 lg:pt-4">
            {[
              {
                icon: Clock,
                color: "#305CDE",
                title: "Rédigez en 3 secondes, pas en 30 minutes",
                desc: "Plus besoin de chercher vos mots. Décrivez simplement votre produit, et l'IA produit une description complète, persuasive et prête à publier.",
              },
              {
                icon: Globe,
                color: "#0ea5e9",
                title: "Adapté au marché africain",
                desc: "L'assistant comprend le contexte local : langues, cultures, habitudes d'achat. Vos fiches produit résonnent avec vos clients.",
              },
              {
                icon: BarChart3,
                color: "#10b981",
                title: "Descriptions optimisées pour vendre",
                desc: "Formulations percutantes, mise en avant des bénéfices, appel à l'action intégré. Chaque mot est pensé pour convertir.",
              },
              {
                icon: Sparkles,
                color: "#f59e0b",
                title: "Inclus dans votre boutique NEXORA",
                desc: "Disponible directement dans le module Boutique E-commerce. Aucun outil externe, aucun abonnement supplémentaire.",
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex gap-4 p-5 rounded-2xl border transition-all card-lift" style={{ background: "#0d1117", borderColor: "#ffffff0d" }}>
                  <div className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: item.color + "20" }}>
                    <Icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <div>
                    <h4 className="text-white font-black text-sm mb-1.5">{item.title}</h4>
                    <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}

            {/* CTA */}
            <button
              onClick={onCTA}
              className="mt-2 w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-base transition-all hover:scale-[1.02] active:scale-95 shadow-xl"
              style={{ background: "linear-gradient(135deg, #305CDE, #305CDE)", color: "white", boxShadow: "0 0 40px #305CDE30" }}
            >
              <Sparkles className="w-5 h-5" />
              Essayer l'assistant IA gratuitement
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-center text-xs text-gray-600">Inclus dans tous les comptes NEXORA · Aucune carte requise</p>
          </div>
        </div>
      </div>
    </section>
  );
}

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
    { name: "Aïcha Koné", country: "🇧🇯 Bénin", text: "NEXORA m'a permis de gérer ma boutique et mes factures depuis mon téléphone. Un vrai gain de temps au quotidien !", stars: 5 },
    { name: "Eric Mensah", country: "🇨🇮 Côte d'Ivoire", text: "PayLink m'a changé la vie pour encaisser mes clients facilement. Nexora est vraiment fait pour l'Afrique.", stars: 5 },
    { name: "Fatou Diallo", country: "🇸🇳 Sénégal", text: "Les factures PDF sont magnifiques, mes clients sont impressionnés. Le transfert d'argent fonctionne parfaitement vers le Sénégal.", stars: 5 },
  ]);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await (supabase as any).from("avis_produits").select("*").is("produit_id", null).is("annonce_id", null).order("created_at", { ascending: false }).limit(50);
        if (data && data.length > 0) {
          const dbReviews = data.map((r: any) => ({ name: r.user_nom, country: "", text: r.commentaire, stars: r.note }));
          setReviews((prev) => [...dbReviews, ...prev.slice(0, 3)]);
        }
      } catch (e) { console.error("Erreur chargement avis:", e); }
    };
    loadReviews();
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); setMenuOpen(false); };

  const submitReview = async () => {
    const nameParts = reviewForm.name.trim().split(/\s+/);
    if (nameParts.length < 2 || !nameParts[1] || nameParts[1].length < 2) { alert("Veuillez entrer votre nom complet (prénom et nom de famille)."); return; }
    if (!reviewForm.text.trim()) return;
    setReviews((prev) => [{ name: reviewForm.name, country: reviewForm.country, text: reviewForm.text, stars: reviewForm.stars }, ...prev]);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await (supabase as any).from("avis_produits").insert({ user_nom: reviewForm.name, commentaire: reviewForm.text, note: reviewForm.stars, user_id: "00000000-0000-0000-0000-000000000000", produit_id: null, annonce_id: null });
    } catch (e) { console.error("Erreur envoi avis:", e); }
    setReviewForm({ name: "", country: "", text: "", stars: 5 });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0f1e] text-gray-900 dark:text-gray-100 overflow-x-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900;1,9..40,400&family=Cabinet+Grotesk:wght@400;500;700;800;900&display=swap');
        .font-display{font-family:'Cabinet Grotesk','DM Sans',sans-serif;font-weight:800;}
        h1,h2,h3{font-family:'Cabinet Grotesk','DM Sans',sans-serif;}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scaleIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
        @keyframes pulse-bleu{0%,100%{box-shadow:0 0 18px rgba(48,92,222,0.55),0 0 36px rgba(48,92,222,0.2);transform:translateY(0px)}50%{box-shadow:0 0 32px rgba(48,92,222,0.9),0 0 64px rgba(48,92,222,0.45);transform:translateY(-5px)}}
        .anim-float{animation:float 5s ease-in-out infinite;}
        .anim-marquee{animation:marquee 30s linear infinite;}
        .anim-fadeup{opacity:0;animation:fadeUp .65s ease forwards;}
        .anim-scalein{animation:scaleIn .4s ease forwards;}
        .btn-violet-pulse{animation:pulse-bleu 2.5s ease-in-out infinite;}
        .btn-violet-pulse:hover{animation:none;transform:scale(1.06);box-shadow:0 0 40px rgba(48,92,222,1);}
        .card-lift{transition:all .3s cubic-bezier(.4,0,.2,1);}
        .card-lift:hover{transform:translateY(-5px);box-shadow:0 20px 40px -10px rgba(0,0,0,.18);}
        .grad-text{background:linear-gradient(135deg,#305CDE,#DC2626 45%,#008000);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .mesh{background:radial-gradient(ellipse at 15% 15%,#e8f0fe 0%,transparent 55%),radial-gradient(ellipse at 85% 10%,#fef2f2 0%,transparent 50%),radial-gradient(ellipse at 85% 85%,#ecfdf5 0%,transparent 50%),#ffffff;}
        .dark .mesh{background:radial-gradient(ellipse at 15% 15%,#1a3170 0%,transparent 55%),radial-gradient(ellipse at 85% 10%,#1a1010 0%,transparent 50%),#0a0f1e;}
        .glass{background:rgba(255,255,255,0.7);backdrop-filter:blur(20px);}
        .dark .glass{background:rgba(10,15,30,0.85);backdrop-filter:blur(20px);}
        .img-violet-border{border:2px solid #305CDE;box-shadow:0 0 16px 2px #305CDE66,0 0 40px 4px #305CDE33;}
        input,textarea{font-family:'DM Sans',sans-serif;}
        .dark input,.dark textarea{background:#1e2433 !important;color:#f1f5f9 !important;border-color:#334155 !important;}
        .dark input::placeholder,.dark textarea::placeholder{color:#64748b !important;}
        .dark input:focus,.dark textarea:focus{border-color:#305CDE !important;}
        @media(max-width:768px){h1{font-size:2.5rem !important;line-height:1.1 !important;}h2{font-size:2rem !important;}}
      `}</style>

      {/* BANNER */}
      <div className="bg-[#305CDE] py-2.5 text-center text-white text-xs font-bold tracking-wide">
        🌍 NEXORA — 12+ modules actifs · Transfert 24 pays · PayLink · Formations · Boutique E-commerce&nbsp;·&nbsp;
        <button onClick={() => navigate("/nexora-shop")} className="underline underline-offset-2 hover:no-underline">🛍️ Nexora Shop</button>
        &nbsp;·&nbsp;
        <button onClick={() => navigate("/login")} className="underline underline-offset-2 hover:no-underline">Commencer gratuitement →</button>
      </div>

      {/* NAV */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "glass border-b border-gray-100 dark:border-white/10 shadow-sm" : "bg-white/0 dark:bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-[68px] flex items-center justify-between">
          <button onClick={() => scrollTo("hero")} className="flex items-center gap-3">
            <img src={LOGO} alt="NEXORA" className="w-9 h-9 object-contain" />
            <span className="font-display text-xl tracking-tight text-gray-900 dark:text-white">NEXORA</span>
          </button>
          <div className="hidden md:flex items-center gap-5 text-[13px] font-semibold text-gray-500 dark:text-gray-400">
            {[["features","Modules"],["paylink","PayLink"],["transfert","Transfert"],["roadmap","Roadmap"],["faq","FAQ"],["download","📱 App"]].map(([id,label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="hover:text-gray-900 dark:hover:text-white transition-colors whitespace-nowrap">{label}</button>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => { const t = toggleTheme(); setDarkMode(t === "dark"); }} className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={() => navigate("/login")} className="text-[13.5px] font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-2 transition-colors">Connexion</button>
            <button onClick={() => navigate("/login")} className="flex items-center gap-1.5 text-[13.5px] font-bold bg-[#305CDE] dark:bg-[#305CDE] text-white px-5 py-2.5 rounded-xl hover:bg-[#1E3FA8] dark:hover:bg-[#1E3FA8] transition-all duration-300 shadow-sm">Créer un compte <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
          <button className="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden glass border-b border-gray-100 dark:border-white/10 px-6 pb-5 pt-2 flex flex-col gap-1">
            {[["features","Tous les modules"],["mlm","Formations"],["paylink","PayLink"],["transfert","Transfert Africa"],["roadmap","Roadmap"],["faq","FAQ"],["download","📱 App"]].map(([id,label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="text-left px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-[#305CDE] hover:bg-[#305CDE]/5 dark:hover:bg-[#305CDE]/10 rounded-xl transition-colors">{label}</button>
            ))}
            <div className="border-t border-gray-100 dark:border-white/10 mt-2 pt-3 flex gap-2">
              <button onClick={() => navigate("/login")} className="flex-1 py-2.5 text-sm font-bold border border-gray-200 dark:border-white/20 text-gray-900 dark:text-white rounded-xl hover:border-gray-300 transition-colors">Connexion</button>
              <button onClick={() => navigate("/login")} className="flex-1 py-2.5 text-sm font-bold bg-[#305CDE] dark:bg-[#305CDE] text-white rounded-xl hover:bg-[#1E3FA8] transition-colors">Créer un compte</button>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section id="hero" className="mesh relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-[#305CDE]/20 dark:bg-[#305CDE]/15 blur-3xl" />
          <div className="absolute top-1/3 -right-20 w-80 h-80 rounded-full bg-[#DC2626]/15 dark:bg-[#DC2626]/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-60 h-60 rounded-full bg-[#008000]/15 dark:bg-[#008000]/10 blur-2xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-5 md:px-8 pt-14 pb-20 md:pt-20 md:pb-28">
          <div className="flex justify-center mb-7">
            <div className="anim-fadeup inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-white/10 border border-[#305CDE]/20 dark:border-[#305CDE]/40 shadow-md text-xs font-black text-[#305CDE] dark:text-[#6B8FE8] uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" /> Plateforme financière tout-en-un · Afrique
              <span className="px-2 py-0.5 bg-[#305CDE] text-white rounded-full text-[10px] font-black">12+ MODULES</span>
            </div>
          </div>
          <div className="text-center">
            <h1 className="anim-fadeup text-[3.2rem] md:text-[5.5rem] font-black tracking-tight leading-[1.04] mb-7 text-gray-950 dark:text-white" style={{ animationDelay: ".08s" }}>
              Gérez, encaissez,<br /><span style={{ color: "#305CDE" }}>vendez</span><span style={{ color: "#111827" }}> &amp; </span><span style={{ color: "#DC2626" }}>gagnez</span><br /><span>en Afrique</span>
            </h1>
            <p className="anim-fadeup text-gray-500 dark:text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-6 leading-relaxed font-normal" style={{ animationDelay: ".18s" }}>
              NEXORA réunit gestion financière, facturation, boutique e-commerce, PayLink, transfert d'argent, formations, coffre-fort et plus — dans une seule app conçue pour l'Afrique.
            </p>

            {/* IA PILL — différenciateur clé */}
            <div className="anim-fadeup flex justify-center mb-10" style={{ animationDelay: ".24s" }}>
              <div
                className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #1a1010 0%, #0d0a2a 100%)",
                  borderColor: "#305CDE30",
                  boxShadow: "0 0 30px #305CDE15",
                }}
              >
                {/* Pulse dot */}
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#305CDE" }} />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "#305CDE" }} />
                </span>
                <Sparkles className="w-4 h-4 text-[#305CDE] flex-shrink-0" />
                <span className="text-sm font-bold text-gray-200">
                  Assistant IA intégré —{" "}
                  <span className="font-black" style={{ color: "#305CDE" }}>
                    descriptions produits rédigées en 3 secondes
                  </span>
                </span>
                <span
                  className="hidden sm:inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full flex-shrink-0"
                  style={{ background: "#305CDE20", color: "#6B8FE8", border: "1px solid #305CDE30" }}
                >
                  <Zap className="w-3 h-3" /> Inclus
                </span>
              </div>
            </div>
            <div className="anim-fadeup flex flex-col sm:flex-row items-center justify-center gap-4 mb-10" style={{ animationDelay: ".28s" }}>
              <button onClick={() => navigate("/login")} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-br from-[#305CDE] to-[#1E3FA8] hover:from-[#1E3FA8] hover:to-[#152E7A] text-white font-bold text-[15px] px-8 py-4 rounded-2xl shadow-xl shadow-[#305CDE]/30 transition-all hover:scale-105 active:scale-95">Commencer gratuitement <ArrowRight className="w-4 h-4" /></button>
              <button onClick={() => navigate("/nexora-shop")} className="w-full sm:w-auto flex items-center justify-center gap-2.5 text-white font-semibold text-[15px] px-7 py-4 rounded-2xl bg-gradient-to-br from-[#DC2626] to-[#B91C1C] hover:from-[#B91C1C] hover:to-[#991B1B] shadow-lg shadow-[#DC2626]/30 transition-all hover:scale-105 active:scale-95">
                <Store className="w-4 h-4" /> Nexora Shop 🛍️
              </button>
              <button onClick={() => setVideoOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2.5 text-gray-700 dark:text-gray-200 font-semibold text-[15px] px-7 py-4 rounded-2xl border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-white/40 transition-all">
                <div className="w-7 h-7 rounded-full bg-[#305CDE] flex items-center justify-center flex-shrink-0"><Play className="w-3 h-3 text-white fill-white" /></div>
                Voir la démo
              </button>
            </div>
            {/* TRUST BADGES */}
            <div className="anim-fadeup flex flex-wrap items-center justify-center gap-3 mb-6" style={{ animationDelay: ".33s" }}>
              {/* Badge 4.9/5 */}
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border shadow-md" style={{ background: "linear-gradient(135deg, #fffbeb, #fef3c7)", borderColor: "#fbbf2440" }}>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="font-black text-amber-700 text-sm">4.9/5</span>
                <span className="text-amber-600 text-xs font-semibold">satisfaction</span>
              </div>
              {/* Badge 500+ utilisateurs */}
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border shadow-md" style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", borderColor: "#22c55e40" }}>
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="font-black text-emerald-700 text-sm">500+</span>
                <span className="text-emerald-600 text-xs font-semibold">entrepreneurs actifs</span>
              </div>
              {/* Badge inscription gratuite */}
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border shadow-md" style={{ background: "linear-gradient(135deg, #eff6ff, #dbeafe)", borderColor: "#3b82f640" }}>
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span className="font-black text-blue-700 text-sm">0 FCFA</span>
                <span className="text-blue-600 text-xs font-semibold">pour commencer</span>
              </div>
            </div>

            <div className="anim-fadeup flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-gray-400 font-medium" style={{ animationDelay: ".38s" }}>
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Données chiffrées</span>
              <span className="hidden sm:block w-1 h-1 rounded-full bg-gray-200 dark:bg-gray-600" />
              
              <span className="hidden sm:block w-1 h-1 rounded-full bg-gray-200 dark:bg-gray-600" />
              <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-[#305CDE]" /> 24 pays Transfert</span>
              <span className="hidden sm:block w-1 h-1 rounded-full bg-gray-200 dark:bg-gray-600" />
              <span className="flex items-center gap-1.5"><QrCode className="w-4 h-4 text-cyan-500" /> PayLink Mobile Money</span>
            </div>
          </div>
          <div className="anim-fadeup mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto" style={{ animationDelay: ".5s" }}>
            {[
              { icon: Wallet, label: "Solde total", value: "842 500 FCFA", color: "#305CDE" },
              { icon: CreditCard, label: "PayLink", value: "24 pays actifs", color: "#06b6d4" },
              { icon: GraduationCap, label: "Formations", value: "Accès illimité", color: "#f59e0b" },
              { icon: ShieldCheck, label: "Sécurité", value: "AES-256", color: "#008000" },
            ].map((c, i) => { const Icon = c.icon; return (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-xl border border-gray-50 dark:border-gray-700 anim-float" style={{ animationDelay: `${i * 0.4}s` }}>
                <div className="w-9 h-9 rounded-xl mb-3 flex items-center justify-center" style={{ background: c.color + "25" }}><Icon className="w-5 h-5" style={{ color: c.color }} /></div>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">{c.label}</p>
                <p className="font-black text-[13px] text-gray-900 dark:text-white leading-tight">{c.value}</p>
              </div>
            ); })}
          </div>
          <div className="anim-fadeup mt-12 max-w-5xl mx-auto" style={{ animationDelay: ".6s" }}>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl img-violet-border">
              <img src="https://i.postimg.cc/fRtP8L5N/nexora.png" alt="Dashboard NEXORA" className="w-full object-cover object-top" />
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

      {/* VIDEO MODAL */}
      {videoOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 anim-scalein" onClick={() => setVideoOpen(false)}>
          <div className="w-full max-w-4xl bg-gray-950 rounded-3xl overflow-hidden shadow-2xl img-violet-border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <p className="text-white font-bold">Présentation NEXORA</p>
              <button onClick={() => setVideoOpen(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"><X className="w-4 h-4 text-white" /></button>
            </div>
            <div className="aspect-video bg-black">
              <iframe width="100%" height="100%" src="https://www.youtube.com/embed/2whA5HSFhio?si=0IhWYz1oPrLYgTcI" title="Présentation NEXORA" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" />
            </div>
          </div>
        </div>
      )}

      {/* OPERATORS MARQUEE */}
      <section className="bg-gray-50 dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800 py-4 overflow-hidden">
        <p className="text-center text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-3">Opérateurs Mobile Money supportés</p>
        <div className="relative overflow-hidden">
          <div className="anim-marquee flex gap-10 whitespace-nowrap">
            {[...OPERATORS, ...OPERATORS].map((op, i) => (
              <span key={i} className="flex-shrink-0 px-4 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-bold text-gray-600 dark:text-gray-300 shadow-sm">{op.name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-gray-950 py-14 md:py-20">
        <div className="max-w-6xl mx-auto px-5 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s, i) => (
            <div key={i}>
              <div className="font-display text-4xl md:text-6xl font-black text-white mb-2"><AnimatedCounter value={s.value} suffix={s.suffix} /></div>
              <div className="text-sm text-gray-400 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* AI DESCRIPTION HELPER SECTION */}
      <AIHeroSection onCTA={() => navigate("/login")} />

      {/* FEATURES */}
      <section id="features" className="max-w-7xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="text-center mb-16">
          <SectionBadge text="12+ Modules actifs" />
          <h2 className="text-4xl md:text-5xl font-black mt-5 mb-4 text-gray-950 dark:text-white">Tout ce dont vous avez besoin,<br />dans une seule app</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-lg leading-relaxed">Chaque module est conçu pour vous faire gagner du temps et de l'argent. Aucun abonnement requis pour commencer.</p>
        </div>
        <div className="space-y-6">
          {FEATURES.map((f, i) => { const Icon = f.icon; return (
            <div key={i} className={`rounded-3xl border overflow-hidden ${i % 2 === 0 ? "bg-white dark:bg-gray-800/60 border-gray-100 dark:border-gray-700" : "bg-gray-50/50 dark:bg-gray-900/60 border-gray-100 dark:border-gray-700"}`}>
              <div className="flex flex-col md:flex-row">
                <div className="md:w-2/5 p-8 md:p-10 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: f.bg }}><Icon className="w-7 h-7" style={{ color: f.color }} /></div>
                    <span className="text-xs font-black px-3 py-1 rounded-full" style={{ background: "#dcfce7", color: "#15803d" }}>✓ {f.tag}</span>
                  </div>
                  <h3 className="text-2xl font-black mb-3 text-gray-950 dark:text-white">{f.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
                <div className="md:w-3/5 p-8 md:p-10 flex items-center" style={{ background: f.bg + "40" }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    {f.points.map((pt, j) => (
                      <div key={j} className="flex items-start gap-3 bg-white/80 dark:bg-gray-800/80 rounded-2xl p-4 border border-white/50 dark:border-gray-700">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: f.color }} />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ); })}
        </div>
      </section>

            {/* PAYLINK SECTION */}
      <section id="paylink" className="max-w-7xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <SectionBadge text="Nexora PayLink" color="#305CDE" />
            <h2 className="text-4xl md:text-5xl font-black mt-5 mb-5 leading-tight text-gray-950 dark:text-white">Encaissez en<br /><span style={{ color: "#0ea5e9" }}>1 lien partagé.</span></h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-8 leading-relaxed">Créez un lien de paiement Mobile Money en quelques secondes. Partagez-le par WhatsApp ou QR code. Vos clients paient directement sans avoir besoin d'un compte NEXORA.</p>
            <div className="space-y-4 mb-8">
              {[
                { icon: QrCode, color: "#06b6d4", title: "QR Code automatique", desc: "Chaque lien génère un QR code que vos clients scannent directement avec leur téléphone." },
                { icon: Globe, color: "#10b981", title: "24 pays Mobile Money", desc: "MTN, Orange, Wave, M-Pesa, Airtel et plus — tous les opérateurs africains supportés." },
                { icon: Zap, color: "#f59e0b", title: "Statistiques en temps réel", desc: "Suivez chaque paiement reçu, le montant total et le nombre de transactions." },
              ].map((item) => { const Icon = item.icon; return (
                <div key={item.title} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: item.color + "20" }}><Icon className="w-5 h-5" style={{ color: item.color }} /></div>
                  <div>
                    <p className="font-black text-sm text-gray-900 dark:text-white">{item.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ); })}
            </div>
            <button onClick={() => navigate("/login")} className="inline-flex items-center gap-2 bg-[#305CDE] hover:bg-[#1E3FA8] text-white font-bold px-7 py-3.5 rounded-2xl shadow-lg shadow-[#305CDE]/30 hover:scale-105 transition-all">
              Créer mon premier PayLink <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-7 border border-white/10 shadow-2xl">
              <div className="flex items-center gap-3 mb-5">
                <img src={LOGO} alt="NEXORA" className="w-8 h-8 object-contain" />
                <div><p className="text-[10px] text-gray-400 uppercase tracking-widest">Nexora PayLink</p><p className="text-white font-black text-sm">Lien de paiement</p></div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                <p className="text-xs text-gray-400 mb-1">Votre lien de paiement</p>
                <p className="text-cyan-400 text-xs font-mono break-all">nexora.africa/pay/votre-nom</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-white">47</p>
                  <p className="text-xs text-gray-400">Paiements reçus</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-emerald-400">235K</p>
                  <p className="text-xs text-gray-400">FCFA encaissés</p>
                </div>
              </div>
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-cyan-400 font-bold">QR Code prêt</p>
                  <p className="text-white text-sm font-black mt-0.5">Scanner pour payer</p>
                </div>
                <QrCode className="w-10 h-10 text-cyan-400" />
              </div>
            </div>
            <div className="absolute -top-3 -right-3 bg-cyan-500 text-white px-4 py-2 rounded-2xl shadow-xl text-xs font-black">✓ Paiement en 10 sec</div>
          </div>
        </div>
      </section>

      {/* TRANSFERT SECTION */}
      <section id="transfert" className="bg-gray-950 py-20 md:py-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <SectionBadge text="Transfert Africa" color="#008000" />
              <h2 className="text-4xl md:text-5xl font-black text-white mt-5 mb-5 leading-tight">Un continent,<br /><span style={{ color: "#38bdf8" }}>une infrastructure.</span></h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">Rechargez votre compte pour seulement 100 FCFA de frais via Mobile Money et envoyez de l'argent vers 24 pays africains avec seulement 3% de frais.</p>
              <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-3">✓ 24 pays éligibles</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6 max-h-64 overflow-y-auto pr-1">
                {COUNTRIES_ACTIVE.map((c) => (
                  <div key={c.name} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                    <span className="text-2xl">{c.flag}</span>
                    <div><p className="text-white font-bold text-sm">{c.name}</p><p className="text-gray-400 text-xs">{c.networks}</p></div>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate("/login")} className="inline-flex items-center gap-2 bg-[#008000] hover:bg-[#006600] text-white font-bold px-7 py-3.5 rounded-2xl shadow-lg shadow-[#008000]/30 hover:scale-105 transition-all">Accéder au Transfert <ArrowRight className="w-4 h-4" /></button>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-7 border border-white/10 shadow-2xl">
                <div className="flex items-center gap-3 mb-6"><img src={LOGO} alt="NEXORA" className="w-8 h-8 object-contain" /><div><p className="text-[10px] text-gray-400 uppercase tracking-widest">Nexora Transfert</p><p className="text-white font-black text-sm">Compte principal</p></div></div>
                <div className="mb-6"><p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Solde disponible</p><p className="text-4xl font-black text-white">125 000 <span className="text-gray-400 text-xl">FCFA</span></p></div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-emerald-500 rounded-xl py-3 text-center font-black text-white text-sm flex items-center justify-center gap-1.5"><ArrowDownLeft className="w-4 h-4" /> Recharger</div>
                  <div className="bg-white/10 border border-white/20 rounded-xl py-3 text-center font-black text-white text-sm flex items-center justify-center gap-1.5"><Send className="w-4 h-4" /> Envoyer</div>
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">Dernières transactions</p>
                <div className="space-y-2">
                  {[{flag:"🇸🇳",pays:"Sénégal",reseau:"Wave",montant:"20 000",t:"out"},{flag:"🇧🇯",pays:"Recharge",reseau:"MTN MoMo",montant:"50 000",t:"in"},{flag:"🇨🇮",pays:"Côte d'Ivoire",reseau:"Orange Money",montant:"15 000",t:"out"}].map((tx,i)=>(
                    <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5">
                      <span className="text-lg">{tx.flag}</span>
                      <div className="flex-1 min-w-0"><p className="text-white text-xs font-bold">{tx.pays}</p><p className="text-gray-500 text-[11px]">{tx.reseau}</p></div>
                      <span className={`font-black text-xs ${tx.t==="in"?"text-emerald-400":"text-sky-300"}`}>{tx.t==="in"?"+":"−"}{tx.montant} FCFA</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -top-3 -right-3 bg-emerald-500 text-white px-4 py-2 rounded-2xl shadow-xl text-xs font-black">✓ Paiement sécurisé</div>
            </div>
          </div>
        </div>
      </section>

      {/* ROADMAP */}
      <section id="roadmap" className="max-w-7xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="text-center mb-14">
          <SectionBadge text="Roadmap publique" color="#008000" />
          <h2 className="text-4xl md:text-5xl font-black mt-5 mb-4 text-gray-950 dark:text-white">Ce qui arrive bientôt</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-lg">NEXORA grandit avec vous. Voici ce que nous construisons pour vous.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ROADMAP.map((item,i)=>(
            <div key={i} className="card-lift bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-7">
              <div className="flex items-center gap-2 mb-4"><span className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-700"><Clock className="w-3 h-3" /> Bientôt</span></div>
              <h3 className="text-xl font-black mb-2 text-gray-950 dark:text-white">{item.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-5">{item.desc}</p>
              <div className="flex justify-between text-xs text-gray-400 font-bold mb-2"><span>Progression</span><span>{item.pct}%</span></div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{width:`${item.pct}%`}} /></div>
            </div>
          ))}
        </div>
      </section>

      {/* SECURITY */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-[#1a2845]/40 dark:via-gray-900 dark:to-[#0f2a1a]/30 py-20">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12">
            <SectionBadge text="Sécurité & Confiance" color="#10b981" />
            <h2 className="text-3xl md:text-4xl font-black mt-5 mb-4 text-gray-950 dark:text-white">Construit pour inspirer confiance</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">Vos données et votre argent sont notre priorité absolue.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: ShieldCheck, color: "#10b981", title: "Chiffrement bout-en-bout", desc: "Toutes vos données financières et personnelles sont chiffrées (AES-256 au repos, TLS 1.3 en transit). Votre coffre-fort digital est inaccessible même pour nos équipes." },
              { icon: Zap, color: "#305CDE", title: "99.9% de disponibilité", desc: "Infrastructure robuste hébergée sur des serveurs certifiés avec redondance et sauvegardes automatiques. NEXORA est disponible quand vous en avez besoin." },
              { icon: Users, color: "#f59e0b", title: "Données vous appartiennent", desc: "Nous ne vendons jamais vos données. Exportez tout à tout moment. Supprimez votre compte quand vous le souhaitez. Vous êtes toujours en contrôle." },
            ].map((item,i)=>{ const Icon=item.icon; return (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-white dark:border-gray-700 shadow-lg text-center card-lift">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{background:item.color+"20"}}><Icon className="w-8 h-8" style={{color:item.color}} /></div>
                <h3 className="font-black text-lg mb-3 text-gray-950 dark:text-white">{item.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ); })}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section id="avis" className="max-w-7xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="text-center mb-14">
          <SectionBadge text="Avis utilisateurs" color="#DC2626" />
          <h2 className="text-4xl md:text-5xl font-black mt-5 mb-4 text-gray-950 dark:text-white">Ce que disent<br />nos utilisateurs</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-lg">Des retours réels d'entrepreneurs africains.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
          {reviews.map((r,i)=>(
            <div key={i} className="card-lift bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-7">
              <div className="flex gap-1 mb-4">{[...Array(r.stars)].map((_,j)=><Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
              <p className="text-gray-700 dark:text-gray-300 text-[15px] leading-relaxed mb-6 italic">"{r.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#305CDE] to-[#DC2626] flex items-center justify-center text-white font-black text-base flex-shrink-0 shadow-md">{r.name.charAt(0)}</div>
                <div><p className="font-black text-sm text-gray-900 dark:text-white">{r.name}</p><p className="text-xs text-gray-400 dark:text-gray-500">{r.country}</p></div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-green-50 dark:from-[#1a2845]/50 dark:to-[#0f2a1a]/40 border border-[#305CDE]/20 dark:border-[#305CDE]/30 rounded-3xl p-8 md:p-10 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-[#305CDE] flex items-center justify-center flex-shrink-0"><MessageSquare className="w-5 h-5 text-white" /></div>
            <div><h3 className="font-black text-lg text-gray-950 dark:text-white">Partagez votre avis</h3><p className="text-xs text-gray-500 dark:text-gray-400">Votre retour aide d'autres utilisateurs</p></div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">Note *</label>
              <div className="flex gap-1">{[1,2,3,4,5].map((s)=><button key={s} type="button" onClick={()=>setReviewForm((p)=>({...p,stars:s}))}><Star className={`w-6 h-6 ${s<=reviewForm.stars?"fill-amber-400 text-amber-400":"text-gray-300 dark:text-gray-600"}`} /></button>)}</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">Nom complet * <span className="normal-case font-normal text-gray-400">(prénom + nom requis)</span></label>
                <input type="text" value={reviewForm.name} onChange={(e)=>setReviewForm((p)=>({...p,name:e.target.value}))} placeholder="Ex : Kouassi Jean" className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 rounded-xl text-sm outline-none focus:border-[#305CDE] focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">Pays</label>
                <input type="text" value={reviewForm.country} onChange={(e)=>setReviewForm((p)=>({...p,country:e.target.value}))} placeholder="Ex : 🇧🇯 Bénin" className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 rounded-xl text-sm outline-none focus:border-[#305CDE] focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">Votre avis *</label>
              <textarea rows={4} value={reviewForm.text} onChange={(e)=>setReviewForm((p)=>({...p,text:e.target.value}))} placeholder="Partagez votre expérience avec NEXORA..." className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 rounded-xl text-sm outline-none focus:border-[#305CDE] focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all resize-none" />
            </div>
            <button onClick={submitReview} disabled={reviewForm.name.trim().split(/\s+/).length<2||!reviewForm.name.trim().split(/\s+/)[1]||!reviewForm.text} className="w-full py-3.5 bg-[#305CDE] hover:bg-[#1E3FA8] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
              <Star className="w-4 h-4 fill-white" /> Publier mon avis
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-4xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="text-center mb-14">
          <SectionBadge text="Questions fréquentes" color="#305CDE" />
          <h2 className="text-4xl md:text-5xl font-black mt-5 mb-4 text-gray-950 dark:text-white">Tout ce que vous<br />devez savoir</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-lg">Retrouvez les réponses aux questions les plus posées sur NEXORA.</p>
        </div>
        <div className="space-y-3">
          {[
            { q: "NEXORA est-il gratuit ?", a: "Oui, l'inscription est 100% gratuite et sans carte bancaire. Vous pouvez accéder à la plupart des modules gratuitement. Certaines fonctionnalités avancées nécessitent un abonnement Premium." },
            { q: "Qu'est-ce que Nexora PayLink ?", a: "PayLink vous permet de créer un lien de paiement Mobile Money personnalisé en quelques secondes. Partagez-le par WhatsApp ou QR code, et vos clients paient directement sans avoir besoin d'un compte NEXORA. Fonctionne dans 24 pays africains." },
            { q: "Comment fonctionne le Transfert d'Argent Africa ?", a: "Rechargez votre compte NEXORA via Mobile Money pour seulement 100 FCFA de frais. Ensuite, transférez vers n'importe lequel des 24 pays actifs avec 3% de frais seulement. Une facture PDF est générée automatiquement." },
            { q: "Qu'est-ce que la Nexora Academy ?", a: "La Nexora Academy est une bibliothèque de contenu exclusif réservée aux membres NEXORA. Elle contient des tutoriels, stratégies business et formations pratiques pour entrepreneurs africains." },
            { q: "Qu'est-ce que la fonctionnalité Contacts WhatsApp ?", a: "Cette fonctionnalité vous permet d'accéder aux contacts WhatsApp des membres NEXORA. Vous pouvez les télécharger au format .vcf (vCard) et les importer directement dans votre téléphone. Idéal pour agrandir votre réseau professionnel en Afrique." },
            { q: "Mes données sont-elles sécurisées ?", a: "Absolument. NEXORA utilise un chiffrement AES-256 pour les données au repos et TLS 1.3 pour les données en transit. Votre coffre-fort digital est inaccessible même pour nos équipes." },
            { q: "Comment créer des factures PDF professionnelles ?", a: "Depuis le module Facturation, remplissez les informations de votre client et vos services, puis générez votre facture PDF en un clic. Le document est personnalisé avec votre branding et numéroté automatiquement." },
            { q: "Comment fonctionne la boutique e-commerce ?", a: "La boutique NEXORA vous permet de vendre vos produits physiques et digitaux en ligne. Créez votre vitrine publique, ajoutez vos produits avec photos et descriptions, définissez vos prix et gérez vos commandes facilement." },
            { q: "Comment passer au plan Premium ?", a: "Rendez-vous dans la section Abonnement depuis votre tableau de bord. Choisissez le plan qui vous convient et payez via Mobile Money. Votre compte est activé instantanément avec un badge bleu vérifié." },
            { q: "Comment contacter le support ?", a: "Vous pouvez nous joindre par email à support@nexora.africa. Notre équipe répond dans les meilleurs délais. Vous pouvez aussi utiliser le chat intégré à la plateforme une fois connecté." },
          ].map((item,i)=><FAQItem key={i} question={item.q} answer={item.a} />)}
        </div>
      </section>

      {/* DOWNLOAD */}
      <section id="download" className="max-w-7xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="relative bg-gray-950 rounded-3xl overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#305CDE]/10 blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#DC2626]/10 blur-3xl" />
          </div>
          <div className="relative flex flex-col md:flex-row items-center gap-12 px-8 md:px-16 py-16 md:py-20">
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#305CDE]/10 border border-[#305CDE]/30 text-xs font-black text-[#305CDE] mb-6 uppercase tracking-widest"><span>📱</span> Application Mobile</div>
              <h2 className="text-3xl md:text-5xl font-black text-white mb-5 leading-tight">Nexora dans<br />votre poche</h2>
              <p className="text-gray-400 text-lg mb-8 max-w-md">Téléchargez l'application Android directement – sans passer par le Play Store. Installez-la en quelques secondes sur votre téléphone.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <a href="/nexora.apk" download="nexora.apk" className="btn-violet-pulse group inline-flex items-center gap-3 text-white font-black px-8 py-4 rounded-2xl text-base active:scale-95" style={{background:"linear-gradient(135deg,#7c3aed 0%,#6d28d9 50%,#305CDE 100%)"}}>
                  <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5S11 23.33 11 22.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zm-2.5-1C2.67 17 2 16.33 2 15.5v-7C2 7.67 2.67 7 3.5 7S5 7.67 5 8.5v7c0 .83-.67 1.5-1.5 1.5zm17 0c-.83 0-1.5-.67-1.5-1.5v-7c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v7c0 .83-.67 1.5-1.5 1.5zM15.53 2.16l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48A5.84 5.84 0 0 0 12 1c-.96 0-1.86.23-2.66.63L7.85.14c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31A5.983 5.983 0 0 0 6 7h12a5.99 5.99 0 0 0-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"/></svg>
                  Télécharger pour Android
                </a>
                <button onClick={()=>{const el=document.getElementById("ios-instructions");if(el)el.classList.toggle("hidden");}} className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all hover:scale-105 active:scale-95">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  Installer sur iPhone
                </button>
              </div>
              <div id="ios-instructions" className="hidden mt-6 p-5 bg-white/5 border border-white/10 rounded-2xl text-left max-w-md">
                <p className="text-white font-bold mb-3 text-sm">📲 Comment installer sur iPhone :</p>
                <ol className="text-gray-400 text-sm space-y-2 list-decimal list-inside">
                  <li>Ouvrez ce site dans <strong className="text-white">Safari</strong></li>
                  <li>Appuyez sur le bouton <strong className="text-white">Partager</strong> → en bas</li>
                  <li>Choisissez <strong className="text-violet-400">« Sur l'écran d'accueil »</strong></li>
                  <li>Appuyez sur <strong className="text-white">Ajouter</strong></li>
                </ol>
              </div>
              <div className="mt-8 flex flex-wrap gap-4 justify-center md:justify-start">
                {[{emoji:"🔒",label:"100% sécurisé"},{emoji:"⚡",label:"Installation rapide"},{emoji:"🆓",label:"Gratuit"}].map((b,i)=>(
                  <div key={i} className="flex items-center gap-2 text-gray-500 text-sm"><span>{b.emoji}</span> {b.label}</div>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-[#305CDE]/20 blur-3xl scale-150" />
                <div className="relative w-48 h-80 bg-gray-800 rounded-[2.5rem] border-4 border-gray-700 shadow-2xl flex flex-col overflow-hidden">
                  <div className="bg-gray-900 h-8 flex items-center justify-center"><div className="w-16 h-1.5 bg-gray-700 rounded-full" /></div>
                  <div className="flex-1 bg-[#0a0e27] flex flex-col items-center justify-center gap-3 p-4">
                    <img src={LOGO} alt="Nexora" className="w-16 h-16 object-contain drop-shadow-lg" />
                    <p className="text-white font-black text-lg tracking-widest">NEXORA</p>
                    <p className="text-violet-400 text-xs font-medium">Gestion financière</p>
                    <div className="w-full bg-[#008000]/20 border border-[#008000]/30 rounded-xl p-2 mt-2">
                      <p className="text-[#008000] text-[10px] font-bold text-center">✓ Application installée</p>
                    </div>
                  </div>
                  <div className="bg-gray-900 h-6 flex items-center justify-center"><div className="w-20 h-1 bg-gray-600 rounded-full" /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-5 md:px-8 pb-20">
        <div className="relative bg-gray-950 rounded-3xl overflow-hidden py-16 md:py-24 px-8 md:px-16 text-center">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 left-1/4 w-72 h-72 rounded-full bg-[#305CDE]/20 blur-3xl" />
            <div className="absolute -bottom-20 right-1/4 w-72 h-72 rounded-full bg-[#DC2626]/20 blur-3xl" />
          </div>
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs font-black text-white mb-8 uppercase tracking-widest"><Sparkles className="w-3.5 h-3.5 text-amber-400" /> Inscription gratuite · Sans carte bancaire</div>
            <h2 className="text-4xl md:text-6xl font-black text-white mb-5 leading-tight">Prêt à transformer<br />votre gestion financière ?</h2>
            <p className="text-gray-400 text-lg max-w-lg mx-auto mb-10">Rejoignez des milliers d'entrepreneurs africains qui font confiance à NEXORA chaque jour.</p>
            <button onClick={()=>navigate("/login")} className="inline-flex items-center gap-2 bg-[#305CDE] text-white font-black px-10 py-4 rounded-2xl text-lg hover:bg-[#1E3FA8] transition-all shadow-2xl hover:scale-105 active:scale-95">Commencer maintenant <ArrowRight className="w-5 h-5" /></button>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
              {[{icon:ShieldCheck,label:"100% sécurisé"},{icon:Globe,label:"24 pays actifs"},{icon:Users,label:"Inscription gratuite"}].map((item,i)=>{ const Icon=item.icon; return <div key={i} className="flex items-center gap-2 text-gray-400 text-sm font-medium"><Icon className="w-4 h-4" /> {item.label}</div>; })}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-950 text-gray-400">
        <div className="max-w-7xl mx-auto px-5 md:px-8 pt-14 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4"><img src={LOGO} alt="NEXORA" className="w-10 h-10 object-contain" /><span className="font-display text-xl font-black text-white tracking-tight">NEXORA</span></div>
              <p className="text-sm leading-relaxed mb-4 text-gray-500">Plateforme financière tout-en-un pour l'Afrique.</p>
              <div className="flex items-center gap-3">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#1877F2] flex items-center justify-center transition-all hover:scale-110"><Facebook className="w-4 h-4 text-white" /></a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/10 hover:bg-black flex items-center justify-center transition-all hover:scale-110"><Twitter className="w-4 h-4 text-white" /></a>
              </div>
            </div>
            <div>
              <p className="text-white font-black text-sm mb-4 uppercase tracking-wider">Modules</p>
              <div className="flex flex-col gap-2">{["Finances","Facturation","Boutique","PayLink","Transfert","Formations","Academy","Coffre-Fort","Immobilier","Contacts WhatsApp","Abonnements & Liens"].map((l)=><button key={l} onClick={()=>navigate("/login")} className="text-sm text-gray-500 hover:text-white text-left transition-colors">{l}</button>)}</div>
            </div>
            <div>
              <p className="text-white font-black text-sm mb-4 uppercase tracking-wider">Ressources</p>
              <div className="flex flex-col gap-2">
                <button onClick={()=>navigate("/nexora-shop")} className="text-sm text-rose-400 hover:text-rose-300 text-left transition-colors font-bold">🛍️ Nexora Shop</button>
                <button onClick={()=>navigate("/login")} className="text-sm text-gray-500 hover:text-white text-left transition-colors">Connexion</button>
                <button onClick={()=>navigate("/login")} className="text-sm text-gray-500 hover:text-white text-left transition-colors">Créer un compte</button>
                <button onClick={()=>scrollTo("avis")} className="text-sm text-gray-500 hover:text-white text-left transition-colors">Témoignages</button>
                <a href="mailto:support@nexora.africa" className="text-sm text-gray-500 hover:text-white text-left transition-colors">Support</a>
              </div>
            </div>
            <div>
              <p className="text-white font-black text-sm mb-4 uppercase tracking-wider">Légal</p>
              <div className="flex flex-col gap-2">
                <button onClick={()=>navigate("/cgu")} className="text-sm text-gray-500 hover:text-white text-left transition-colors">CGU</button>
                <button onClick={()=>navigate("/cgv")} className="text-sm text-gray-500 hover:text-white text-left transition-colors">CGV</button>
                <button onClick={()=>navigate("/confidentialite")} className="text-sm text-gray-500 hover:text-white text-left transition-colors">Confidentialité</button>
                <button onClick={()=>navigate("/cookies")} className="text-sm text-gray-500 hover:text-white text-left transition-colors">Cookies</button>
                <button onClick={()=>navigate("/mentions-legales")} className="text-sm text-gray-500 hover:text-white text-left transition-colors">Mentions légales</button>
              </div>
              <div className="mt-4">
                <p className="text-white font-black text-xs mb-2 uppercase tracking-wider">Pays actifs</p>
                <div className="flex flex-wrap gap-1.5">{["🇧🇯","🇨🇮","🇹🇬","🇸🇳","🇳🇪","🇧🇫","🇨🇲","🇨🇩..."].map((f,i)=><span key={i} className="text-lg">{f}</span>)}</div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-600">© {new Date().getFullYear()} NEXORA. Tous droits réservés.</p>
            <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
              <button onClick={()=>navigate("/cgu")} className="hover:text-white transition-colors">CGU</button>
              <button onClick={()=>navigate("/cgv")} className="hover:text-white transition-colors">CGV</button>
              <button onClick={()=>navigate("/confidentialite")} className="hover:text-white transition-colors">Confidentialité</button>
              <button onClick={()=>navigate("/cookies")} className="hover:text-white transition-colors">Cookies</button>
              <button onClick={()=>navigate("/mentions-legales")} className="hover:text-white transition-colors">Mentions légales</button>
              <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Sécurisé</span>
            </div>
          </div>
        </div>
      </footer>

      {/* WHATSAPP FLOATING BUTTON */}
      <WhatsAppFloat phone="2290155237685" />
    </div>
  );
}
