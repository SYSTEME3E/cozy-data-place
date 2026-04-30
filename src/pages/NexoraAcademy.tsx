import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CryptoPaymentModal from "@/components/CryptoPaymentModal";

// ─── Countdown Hook ────────────────────────────────────────────────────────────
function useCountdown() {
  const daysRef   = useRef<HTMLSpanElement>(null);
  const hoursRef  = useRef<HTMLSpanElement>(null);
  const minsRef   = useRef<HTMLSpanElement>(null);
  const secsRef   = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const CYCLE_MS = 5 * 24 * 60 * 60 * 1000;
    const REF      = new Date("2024-01-01T00:00:00").getTime();
    const pad      = (n: number) => String(n).padStart(2, "0");

    const tick = () => {
      const rem = CYCLE_MS - ((Date.now() - REF) % CYCLE_MS);
      const d = Math.floor(rem / 86_400_000);
      const h = Math.floor((rem % 86_400_000) / 3_600_000);
      const m = Math.floor((rem % 3_600_000)  /    60_000);
      const s = Math.floor((rem %    60_000)  /     1_000);
      if (daysRef.current)  daysRef.current.textContent  = pad(d);
      if (hoursRef.current) hoursRef.current.textContent = pad(h);
      if (minsRef.current)  minsRef.current.textContent  = pad(m);
      if (secsRef.current)  secsRef.current.textContent  = pad(s);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return { daysRef, hoursRef, minsRef, secsRef };
}

// ─── Scroll fade-in Hook ───────────────────────────────────────────────────────
function useFadeIn() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".na-fade");
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("na-visible"); }),
      { threshold: 0.1 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const MODULES = [
  {
    tag: "MODULE 01",
    title: "Trouver ton idée de produit rentable",
    img: "https://i.postimg.cc/4dP77dk9/20260127-060037-0000.png",
    bullets: [
      "Les <b>3 piliers stratégiques</b> pour réussir ton business digital en Afrique.",
      "Comment <b>déjouer les erreurs fatales</b> qui bloquent 90 % des débutants.",
      "<b>Exercice pratique :</b> définir ton positionnement unique et tes objectifs.",
    ],
    footer: "La méthode la plus directe pour encaisser des <b>profits réels</b>.",
  },
  {
    tag: "MODULE 02",
    title: "Créer ton produit digital (ebook inclus)",
    img: "https://i.postimg.cc/PfM9JkCB/Design-sans-titre-20260127-061454-0000.png",
    bullets: [
      "Comment <b>écrire ton ebook</b> efficacement.",
      "Outils gratuits : <b>Canva, Google Docs, ChatGPT…</b>",
      "<b>Bonus :</b> modèle d'ebook vierge offert.",
    ],
    footer: "Construis ton premier produit de <b>qualité pro</b> sans compétences techniques.",
  },
  {
    tag: "MODULE 03",
    title: "Construire ton offre et ton tunnel de ventes",
    img: "https://i.postimg.cc/RZbNz81h/Design_sans_titre_20260127_062613_0000.png",
    bullets: [
      "Structure d'une <b>page de vente</b> efficace.",
      "<b>Prix psychologique</b> et valeur perçue.",
    ],
    footer: "Transforme ton produit en une <b>offre irrésistible</b> prête à être achetée.",
  },
  {
    tag: "MODULE 04",
    title: "Lancer ton offre et faire ta première vente",
    img: "https://i.postimg.cc/c1Qh47bs/Design-sans-titre-20260127-064052-0000.png",
    bullets: [
      "Plan de lancement étape par étape sur <b>7 jours.</b>",
      "Canaux gratuits : <b>WhatsApp, Facebook, TikTok.</b>",
      "Avance vers tes <b>100 premières ventes.</b>",
    ],
    footer: "Fais ton premier chiffre d'affaires <b>dès cette semaine.</b>",
  },
  {
    tag: "MODULE 05",
    title: "Dominer la publicité pour exploser tes ventes",
    img: "https://i.postimg.cc/X7g0FCXP/Design-sans-titre-20260127-065200-0000.png",
    bullets: [
      "Mettre en place tes premières <b>campagnes publicitaires</b> rentables.",
      "Ciblage stratégique : toucher tes <b>futurs clients</b> avec précision.",
      "Optimiser tes pubs pour <b>dépenser moins et gagner plus.</b>",
    ],
    footer: "Transforme chaque franc investi en <b>profits massifs.</b>",
  },
];

const AUDIENCE = [
  { emoji: "🎓", role: "Étudiant visionnaire", desc: "Tu veux bâtir un projet concret dès maintenant." },
  { emoji: "💼", role: "Salarié ambitieux", desc: "Tu cherches à briser le plafond de ton revenu." },
  { emoji: "🚀", role: "Freelance & Coach", desc: "Tu veux transformer ton savoir en revenu passif." },
  { emoji: "🌍", role: "Libre penseur", desc: "Tu vises l'indépendance financière depuis chez toi." },
];

const ERRORS = [
  { e: "🧭", t: "Tu ne sais pas par où commencer." },
  { e: "💡", t: "Tu as des idées mais aucune méthode claire." },
  { e: "⚙️", t: "Tu te perds dans la technique et les outils." },
  { e: "📉", t: "Tu testes des choses sans résultats concrets." },
  { e: "🧠", t: "Tu doutes car personne autour de toi ne réussit." },
  { e: "⏳", t: "Tu stagnes pendant que d'autres encaissent chaque semaine." },
];

const BENEFITS = [
  { label: "Le Système Complet", desc: "Transformer une idée en business rentable." },
  { label: "Ingénierie de l'Offre", desc: "Créer un produit digital que tes clients s'arrachent." },
  { label: "Machine à Vendre", desc: "Configurer ton tunnel sans aucune technique." },
  { label: "Stratégie de Visibilité", desc: "Attirer des clients sans dépenser en publicité." },
  { label: "Automatisation Totale", desc: "Encaisser tes gains même pendant ton sommeil." },
  { label: "Coaching Direct", desc: "2 sessions privées pour débloquer tes résultats." },
  { label: "Cercle des Privilégiés", desc: "Accès illimité au groupe d'entraide VIP." },
  { label: "Sérénité Garantie", desc: "7 jours pour tester ou être remboursé sans question." },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function NexoraAcademy() {
  const navigate = useNavigate();
  const { daysRef, hoursRef, minsRef, secsRef } = useCountdown();
  useFadeIn();

  const FORMATION_URL = "https://cozy-data-place-nu.vercel.app/formations/14050f23-500d-43b2-9a0c-2485767a1437/";
  const goFormation = () => window.open(FORMATION_URL, "_blank");

  // ── Crypto payment state ──────────────────────────────────────────────────
  const [cryptoModalOpen, setCryptoModalOpen] = useState(false);

  // Wallets admin Nexora Academy (USDT-TRC20 + BNB)
  // Prix : 50 000 FCFA ≈ 85 USD — configurable ici
  const NEXORA_CRYPTO_WALLETS = [
    {
      reseau:    "usdttrc20" as const,
      adresse:   "",   // ← À remplir : adresse USDT TRC-20 de l'admin
      prix_usdt: 85,   // ≈ 50 000 FCFA
    },
    {
      reseau:    "bnbbsc" as const,
      adresse:   "",   // ← À remplir : adresse BNB (BSC) de l'admin
      prix_usdt: 85,   // NOWPayments convertira en BNB équivalent
    },
  ].filter(w => w.adresse.length > 0);  // n'afficher que les wallets configurés

  const cryptoEnabled = NEXORA_CRYPTO_WALLETS.length > 0;

  // Progress bar + sticky countdown
  const progressRef = useRef<HTMLDivElement>(null);
  const stickyRef   = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Scroll progress bar
    const onScroll = () => {
      const el = progressRef.current;
      if (!el) return;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      el.style.width = `${Math.min((window.scrollY / total) * 100, 100)}%`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Sticky countdown (same cycle as main countdown)
    const CYCLE_MS = 5 * 24 * 60 * 60 * 1000;
    const REF_DATE = new Date("2024-01-01T00:00:00").getTime();
    const pad = (n: number) => String(n).padStart(2, "0");
    const tickSticky = () => {
      const rem = CYCLE_MS - ((Date.now() - REF_DATE) % CYCLE_MS);
      const h = Math.floor((rem % 86_400_000) / 3_600_000);
      const m = Math.floor((rem % 3_600_000)  /    60_000);
      const s = Math.floor((rem %    60_000)  /     1_000);
      if (stickyRef.current) stickyRef.current.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
    };
    tickSticky();
    const id = setInterval(tickSticky, 1000);

    return () => {
      window.removeEventListener("scroll", onScroll);
      clearInterval(id);
    };
  }, []);

  return (
    <>
      <style>{CSS}</style>

      {/* ── BANNIÈRE URGENCE STICKY ── */}
      <div className="na-sticky-bar">
        <span className="na-sticky-fire">🔥</span>
        <span>Offre à <strong>-50%</strong> — Plus que </span>
        <span className="na-sticky-countdown" ref={stickyRef} />
        <button className="na-sticky-btn" onClick={goFormation}>J'EN PROFITE →</button>
      </div>

      {/* ── BOUTON FLOTTANT MOBILE ── */}
      <div className="na-float-cta">
        <button
          className="na-btn na-btn-purple na-pulse"
          style={{
            width: "100%",
            padding: "16px 20px",
            fontSize: ".9rem",
            borderRadius: 14,
            backgroundColor: "#7C3AED",
            background: "linear-gradient(135deg, #7C3AED, #9D4EDD)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(124, 58, 237, 0.45)"
          }}
          onClick={goFormation}
        >
          🚀 REJOINDRE NEXORA ACADEMY
        </button>
      </div>

      {/* ── BARRE DE PROGRESSION ── */}
      <div className="na-progress-bar" ref={progressRef} />

      {/* ── HERO ── */}
      <section className="na-hero">
        <div className="na-hero-bg" />
        <div className="na-container na-hero-inner">
          <div className="na-badge-pill">
            <span className="na-dot" /> Places limitées — Offre active
          </div>
          <h1 className="na-hero-h1">
            Transforme tes idées en<br />
            <span className="na-red">revenus digitaux</span><br />
            dès aujourd'hui.
          </h1>
          <p className="na-hero-sub">
            La première formation 100 % adaptée à la réalité africaine pour créer et
            vendre tes produits digitaux — même en partant de zéro.
          </p>
          <button className="na-btn na-btn-red na-btn-xl" onClick={goFormation}>
            Rejoindre NEXORA ACADEMY →
          </button>
          <div className="na-trust-row">
            <div className="na-trust-badge">
              <span className="na-trust-icon">✅</span>
              <span className="na-trust-label">ACCÈS<br/>IMMÉDIAT</span>
            </div>
            <div className="na-trust-sep" />
            <div className="na-trust-badge">
              <span className="na-trust-icon">🛡️</span>
              <span className="na-trust-label">GARANTIE 7 JOURS</span>
            </div>
            <div className="na-trust-sep" />
            <div className="na-trust-badge">
              <span className="na-trust-icon">🔒</span>
              <span className="na-trust-label">PLACES<br/>LIMITÉES</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── PACK VISUAL ── */}
      <section className="na-pack-section">
        <div className="na-container na-pack-inner">
          <img
            src="https://i.postimg.cc/TP54rfmJ/DIGITAL_20260127_101526_0000.png"
            alt="Pack NEXORA Academy"
            className="na-pack-img"
          />
          <div className="na-grey-box">
            Et c'est précisément ce système que tu vas maîtriser avec{" "}
            <strong>NEXORA Academy</strong>
          </div>
          <p className="na-pack-text">
            Une méthode <strong>claire, concrète et adaptée</strong> pour lancer ton propre
            empire digital et encaisser tes premiers profits en moins de 30 jours.
          </p>
          <button className="na-btn na-btn-blue na-btn-xl na-pulse" onClick={goFormation}>
            REJOINDRE LE PROGRAMME MAINTENANT
          </button>
        </div>
      </section>

      {/* ── TRAFFIC ANALYZER ── */}
      <section className="na-section na-light-grey">
        <div className="na-container">
          <h2 className="na-ta-main-title">
            ACCÈS À L'OUTIL DE DÉTECTION DES PRODUITS WINNERS : TRAFFIC ANALYZER
          </h2>

          {/* Image 1 */}
          <div className="na-ta-img-box" style={{marginBottom:32}}>
            <img src="https://i.postimg.cc/sx1CrVpN/6920be35048f0-TA1-png.webp" alt="Traffic Analyzer 1" className="na-ta-img" />
          </div>

          {/* Texte intro */}
          <p className="na-ta-intro">
            Trouve en quelques secondes les produits digitaux qui se vendent déjà, sans perdre de temps sur des idées au hasard.
          </p>

          {/* Bullets intro */}
          <ul className="na-ta-list" style={{marginBottom:40}}>
            <li>
              <svg viewBox="0 0 24 24" width="26" height="26" style={{flexShrink:0}}><circle cx="12" cy="12" r="10" fill="#e60000"/><path d="M10 8l4 4-4 4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <p>Avec ton accès <strong>Digital Profit Academy</strong>, tu recevras également un outil exclusif qui te permet d'identifier les produits les plus rentables du moment.</p>
            </li>
            <li>
              <svg viewBox="0 0 24 24" width="26" height="26" style={{flexShrink:0}}><circle cx="12" cy="12" r="10" fill="#e60000"/><path d="M10 8l4 4-4 4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <p>Cet outil analyse les tendances, la demande et la performance réelle des produits digitaux sur la marketplace.</p>
            </li>
          </ul>

          {/* Image 2 */}
          <div className="na-ta-img-box" style={{marginBottom:36}}>
            <img src="https://i.postimg.cc/85PqR1nC/6920be66812a8-TA2-png.webp" alt="Traffic Analyzer 2" className="na-ta-img" />
          </div>

          {/* TU VAS POUVOIR */}
          <h3 className="na-ta-pouvoir-title">TU VAS POUVOIR</h3>
          <ul className="na-ta-list" style={{marginBottom:40}}>
            {[
              "Repérer instantanément les produits qui se vendent déjà très bien",
              "Éviter les idées risquées et les produits qui ne marchent pas",
              "Découvrir le marché de tes concurrents pour ta veille stratégique",
              "Choisir ton idée de produit en quelques minutes, même si tu pars de zéro",
              "Valider ton propre produit avant même de le créer",
            ].map((txt, i) => (
              <li key={i}>
                <svg viewBox="0 0 24 24" width="26" height="26" style={{flexShrink:0}}><circle cx="12" cy="12" r="10" fill="#e60000"/><path d="M10 8l4 4-4 4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <p>{txt}</p>
              </li>
            ))}
          </ul>

          <div style={{borderTop:"1px solid #ddd",paddingTop:28}}>
            <p style={{fontSize:"1rem",fontWeight:700,marginBottom:20,color:"#333"}}>En rejoignant le programme dès maintenant</p>
            <button className="na-btn na-btn-green na-btn-xl na-pulse" style={{width:"100%"}} onClick={goFormation}>
              REJOINDRE LA DIGITAL PROFIT ACADEMY
            </button>
          </div>
        </div>
      </section>

      {/* ── ET TOUT ÇA ── */}
      <section className="na-section na-light-grey">
        <div className="na-container">
          <h2 style={{color:"#e60000",fontSize:"clamp(2.6rem,9vw,4.5rem)",fontWeight:900,lineHeight:0.9,marginBottom:32,fontFamily:"Montserrat,sans-serif",textTransform:"uppercase",textAlign:"left"}}>
            ET<br/>TOUT ÇA
          </h2>
          <div className="na-etc-grid">
            <div className="na-etc-item">
              <div className="na-etc-icon" style={{background:"rgba(41,121,255,.1)",borderRadius:12}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#2979ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="40" height="40">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
              </div>
              <p style={{fontSize:"1rem",lineHeight:1.5,margin:0,color:"#333"}}>Sans compétence technique, sans pub, et sans gros budget.</p>
            </div>
            <div className="na-etc-item">
              <div className="na-etc-icon" style={{background:"rgba(0,179,125,.1)",borderRadius:12}}>
                <svg viewBox="0 0 512 512" fill="#00b37d" width="40" height="40">
                  <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/>
                </svg>
              </div>
              <p style={{fontSize:"1rem",lineHeight:1.5,margin:0,color:"#333"}}>C'est une méthode pensée pour les réalités du terrain africain. Simple. Efficace. Accessible.</p>
            </div>
          </div>
          <div style={{marginTop:32,marginBottom:28}}>
            <button className="na-btn na-btn-blue na-btn-xl na-pulse" onClick={goFormation}>
              REJOINDRE LE PROGRAMME MAINTENANT
            </button>
          </div>
          <p style={{fontSize:"1rem",lineHeight:1.6,color:"#555",marginBottom:36}}>
            Tu vas suivre un parcours clair, étape par étape, pour passer de l'idée à la vente — <strong>même si tu n'as encore rien commencé.</strong>
          </p>
          <h2 style={{color:"#e60000",fontSize:"clamp(1.4rem,4vw,2rem)",fontWeight:900,textTransform:"uppercase",lineHeight:1.2,letterSpacing:1,fontFamily:"Montserrat,sans-serif",textAlign:"left"}}>
            DÉCOUVRE LES 5 MODULES<br/>DU PROGRAMME
          </h2>
        </div>
      </section>

      {/* ── POUR QUI ── */}
      <section className="na-section na-white">
        <div className="na-container">
          <div className="na-label">Pour qui ?</div>
          <h2 className="na-section-title">Ce programme est fait pour toi</h2>
          <p className="na-section-sub">Peu importe ton profil, NEXORA Academy t'accompagne de zéro au premier revenu.</p>
          <div className="na-audience-grid na-fade">
            {AUDIENCE.map((a) => (
              <div className="na-audience-card" key={a.role}>
                <div className="na-audience-emoji">{a.emoji}</div>
                <div className="na-audience-role">{a.role}</div>
                <div className="na-audience-desc">{a.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ERREURS ── */}
      <section className="na-section na-light-grey">
        <div className="na-container">
          <div className="na-label">Le problème</div>
          <h2 className="na-section-title">Les erreurs qui t'empêchent d'avancer</h2>
          <p className="na-section-sub">Tu as sûrement déjà essayé… sans résultats. Voilà pourquoi.</p>
          <div className="na-errors-grid na-fade">
            {ERRORS.map((e) => (
              <div className="na-error-card" key={e.t}>
                <span className="na-error-icon">{e.e}</span>
                <p className="na-error-text">{e.t}</p>
              </div>
            ))}
          </div>
          <div className="na-stagnation-box na-fade">
            <strong>RÉSULTAT ? TU STAGNES.</strong><br />
            Pendant ce temps, d'autres créent des revenus chaque semaine depuis leur téléphone.
          </div>
          <div style={{ textAlign: "center", marginTop: 36 }}>
            <button className="na-btn na-btn-red na-btn-xl" onClick={goFormation}>
              REJOINDRE LE PROGRAMME MAINTENANT
            </button>
          </div>
        </div>
      </section>

      {/* ── AVANT / APRÈS ── */}
      <section className="na-section na-white">
        <div className="na-container">
          <div className="na-label">La transformation</div>
          <h2 className="na-section-title">Sans NEXORA vs Avec NEXORA</h2>
          <p className="na-section-sub">La différence entre stagner et encaisser chaque semaine.</p>
          <div className="na-aa-grid na-fade">
            {/* SANS */}
            <div className="na-aa-card na-aa-before">
              <div className="na-aa-header">
                <span className="na-aa-emoji">❌</span>
                <h3 className="na-aa-title">Sans NEXORA Academy</h3>
              </div>
              <ul className="na-aa-list">
                {[
                  "Tu cherches sans trouver une idée de produit",
                  "Tu passes des heures sur YouTube sans méthode claire",
                  "Tu ne sais pas comment fixer ton prix ni créer ton offre",
                  "Tu postes sur les réseaux sans avoir de ventes",
                  "Tu doutes et tu procrastines pendant des mois",
                  "Tu regardes les autres réussir sans comprendre pourquoi",
                ].map((t, i) => (
                  <li key={i}>
                    <span className="na-aa-icon-bad">✕</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* AVEC */}
            <div className="na-aa-card na-aa-after">
              <div className="na-aa-header">
                <span className="na-aa-emoji">✅</span>
                <h3 className="na-aa-title">Avec NEXORA Academy</h3>
              </div>
              <ul className="na-aa-list">
                {[
                  "Tu trouves ton idée de produit rentable en quelques minutes",
                  "Tu suis un plan clair, étape par étape, vers ta première vente",
                  "Tu crées une offre irrésistible avec le bon prix",
                  "Tu attires des clients grâce à des stratégies gratuites",
                  "Tu passes à l'action avec confiance et méthode",
                  "Tu encaisses tes premiers revenus depuis ton téléphone",
                ].map((t, i) => (
                  <li key={i}>
                    <span className="na-aa-icon-good">✓</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div style={{marginTop:36}}>
            <button className="na-btn na-btn-red na-btn-xl na-pulse" onClick={goFormation}>
              JE VEUX REJOINDRE NEXORA ACADEMY →
            </button>
          </div>
        </div>
      </section>

      {/* ── TÉMOIGNAGES ── */}
      <section className="na-section na-light-grey">
        <div className="na-container">
          <div className="na-label">Ils témoignent</div>
          <h2 className="na-section-title">Ils ont sauté le pas. Voilà leurs résultats.</h2>
          <p className="na-section-sub">Des membres réels, des résultats concrets depuis l'Afrique.</p>
          <div className="na-testi-grid na-fade">
            {[
              { name: "Kofi A.", city: "Cotonou, Bénin", emoji: "🇧🇯", stars: 5, result: "Première vente en 11 jours", text: "J'avais peur de ne pas y arriver depuis mon téléphone. Avec le Module 4, j'ai lancé mon ebook sur WhatsApp et j'ai encaissé mes premières ventes en moins de 2 semaines. La méthode est vraiment adaptée à notre réalité." },
              { name: "Fatou D.", city: "Dakar, Sénégal", emoji: "🇸🇳", stars: 5, result: "50 000 FCFA générés en 1 mois", text: "Je suis étudiante et je n'avais aucune expérience en business. NEXORA Academy m'a montré comment transformer mes connaissances en cours particuliers digitaux. Aujourd'hui j'ai ma propre source de revenus." },
              { name: "Emmanuel T.", city: "Abidjan, Côte d'Ivoire", emoji: "🇨🇮", stars: 5, result: "Business lancé en 3 semaines", text: "Le Traffic Analyzer est une pépite. J'ai trouvé mon niche en quelques minutes et évité des erreurs coûteuses. La formation est dense, structurée et surtout — elle fonctionne vraiment sur le terrain africain." },
            ].map((t, i) => (
              <div className="na-testi-card" key={i}>
                <div className="na-testi-stars">{"⭐".repeat(t.stars)}</div>
                <p className="na-testi-text">"{t.text}"</p>
                <div className="na-testi-result">
                  <span className="na-testi-result-icon">🏆</span>
                  <span>{t.result}</span>
                </div>
                <div className="na-testi-footer">
                  <div className="na-testi-avatar">{t.emoji}</div>
                  <div>
                    <div className="na-testi-name">{t.name}</div>
                    <div className="na-testi-city">{t.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{textAlign:"center",marginTop:36}}>
            <button className="na-btn na-btn-blue na-btn-xl na-pulse" onClick={goFormation}>
              REJOINDRE LA COMMUNAUTÉ MAINTENANT
            </button>
          </div>
        </div>
      </section>

      {/* ── GARANTIE ── */}
      <section className="na-section na-white">
        <div className="na-container">
          <div className="na-guarantee-box na-fade">
            <div className="na-guarantee-badge">
              <div className="na-guarantee-shield">🛡️</div>
              <div className="na-guarantee-days">7</div>
              <div className="na-guarantee-label">JOURS</div>
            </div>
            <div className="na-guarantee-content">
              <h3 className="na-guarantee-title">Garantie Satisfait ou 100% Remboursé</h3>
              <p className="na-guarantee-text">
                Nous croyons tellement en NEXORA Academy que nous assumons tous les risques à ta place. Si dans les <strong>7 premiers jours</strong> tu estimes que la formation ne te convient pas — pour n'importe quelle raison — envoie-nous simplement un message et nous te remboursons <strong>intégralement, sans question, sans délai.</strong>
              </p>
              <p className="na-guarantee-text" style={{marginTop:12}}>
                Tu n'as <strong>rien à perdre</strong>. Tu as tout à gagner.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── MÉTHODE ── */}
      <section className="na-section na-white">
        <div className="na-container">
          <div className="na-label">La méthode</div>
          <h2 className="na-section-title">3 étapes. Un système. Des résultats.</h2>
          <p className="na-section-sub">Le système exact pour transformer tes connaissances en revenus automatiques.</p>
          <div className="na-steps-row na-fade">
            {[
              { n: "01", t: "Conception", d: "Créer un produit digital qui se vend tout seul, conçu pour ton marché." },
              { n: "02", t: "Système", d: "Structure simple sans stock ni logistique, depuis n'importe quel appareil." },
              { n: "03", t: "Profit", d: "Encaisser et scaler tes revenus, même pendant que tu dors." },
            ].map((s) => (
              <div className="na-step" key={s.n}>
                <div className="na-step-num">{s.n}</div>
                <div className="na-step-title">{s.t}</div>
                <div className="na-step-desc">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODULES ── */}
      <section className="na-section na-light-grey" id="modules">
        <div className="na-container">
          <div className="na-label">Le programme</div>
          <h2 className="na-section-title">5 Modules pour passer de zéro à la vente</h2>
          <p className="na-section-sub">Chaque module te mène à un résultat concret, étape par étape.</p>

          {/* Grille 2 colonnes pour modules 1-2 */}
          <div className="na-modules-grid-2 na-fade">
            {MODULES.slice(0, 2).map((m) => (
              <ModuleCard key={m.tag} mod={m} />
            ))}
          </div>

          {/* Grille 2 colonnes pour modules 3-4 */}
          <div className="na-modules-grid-2 na-fade" style={{ marginTop: 32 }}>
            {MODULES.slice(2, 4).map((m) => (
              <ModuleCard key={m.tag} mod={m} />
            ))}
          </div>

          {/* Module 5 centré */}
          <div className="na-module5-wrap na-fade" style={{ marginTop: 32 }}>
            <ModuleCard mod={MODULES[4]} />
          </div>
        </div>
      </section>

      {/* ── OFFER RESUME ── */}
      <section className="na-section na-white">
        <div className="na-container">
          <div className="na-offer-grid na-fade">
            {/* Colonne gauche — liste modules */}
            <div className="na-offer-left">
              <p className="na-offer-pretitle">En rejoignant le programme dès maintenant</p>
              <h2 className="na-offer-title">TU BÉNÉFICIERAS DE :</h2>
              <div className="na-red-divider" />
              <ul className="na-modules-list">
                {MODULES.map((m) => (
                  <li key={m.tag}>
                    <span className="na-grad-icon">🎓</span>
                    <p><strong>{m.tag} :</strong> {m.title.toUpperCase()}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Colonne droite — pricing card */}
            <div className="na-pricing-card">
              <div className="na-discount-badge">50% DE RÉDUCTION</div>
              <p className="na-immediate">Immédiate</p>
              <h3 className="na-warning-title">⚠️ MAIS ATTENTION</h3>
              <p className="na-warning-text">
                Cette réduction est <strong>temporaire</strong> et réservée aux{" "}
                <strong>100 premiers inscrits.</strong>
              </p>
              <img
                src="https://i.postimg.cc/TP54rfmJ/DIGITAL_20260127_101526_0000.png"
                alt="Pack"
                className="na-stack-img"
              />
              <div className="na-price-display">
                <span className="na-price-current">50 000 FCFA</span>
                <p className="na-price-label">AU LIEU DE :</p>
                <span className="na-price-old">100 000 FCFA</span>
              </div>
              <div className="na-pricing-footer">
                <div className="na-footer-row"><span className="na-rbullet">▶</span><p>Cette offre est unique et les places sont strictement limitées.</p></div>
                <div className="na-footer-row"><span className="na-rbullet">▶</span><p>Clique sur le bouton ci-dessous pour profiter d'une place avant qu'il ne soit trop tard.</p></div>
              </div>
              <button className="na-btn na-btn-red na-btn-xl" style={{ width: "100%" }} onClick={goFormation}>
                REJOINDRE LE PROGRAMME MAINTENANT
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── SALES SECTION ── */}
      <section className="na-section na-light-grey">
        <div className="na-container">
          <h2 className="na-sales-title">
            Pour seulement <span className="na-red">50 000 FCFA</span> (le prix d'un dîner au restaurant), vous obtenez :
          </h2>
          <div className="na-sales-card na-fade">
            <ul className="na-benefits-list">
              <li className="na-list-header">LA FORMATION (5 MODULES CLÉS)</li>
              {BENEFITS.slice(0, 5).map((b) => (
                <li key={b.label} className="na-benefit-item">
                  <span className="na-check-icon" />
                  <span><strong>{b.label} :</strong> {b.desc}</span>
                </li>
              ))}
              <li className="na-list-header">ACCOMPAGNEMENT &amp; GARANTIES</li>
              {BENEFITS.slice(5).map((b) => (
                <li key={b.label} className="na-benefit-item">
                  <span className="na-check-icon" />
                  <span><strong>{b.label} :</strong> {b.desc}</span>
                </li>
              ))}
            </ul>

            <div className="na-action-area">
              <p className="na-instruction">CLIQUEZ CI-DESSOUS POUR RÉSERVER VOTRE PLACE</p>
              <div className="na-price-box">
                <p className="na-old-price">Tarif Habituel : <del>100 000 F CFA</del></p>
                <p className="na-offer-label">OFFRE EXCEPTIONNELLE :</p>
                <p className="na-big-price">50 000 F CFA</p>
                <p className="na-savings">Économie immédiate de 50 000 F CFA</p>
              </div>
              <button className="na-btn na-btn-red na-btn-xl na-pulse" style={{ width: "100%" }} onClick={goFormation}>
                JE PROFITE DE L'OFFRE MAINTENANT
              </button>
              <p className="na-warning-places">⚠️ Places limitées pour garantir la qualité de l'accompagnement.</p>

              {/* Countdown */}
              <div className="na-countdown">
                <div className="na-cd-unit"><span ref={daysRef} className="na-cd-num">00</span><label>JOURS</label></div>
                <div className="na-cd-unit"><span ref={hoursRef} className="na-cd-num">00</span><label>HEURES</label></div>
                <div className="na-cd-unit"><span ref={minsRef} className="na-cd-num">00</span><label>MINUTES</label></div>
                <div className="na-cd-unit"><span ref={secsRef} className="na-cd-num">00</span><label>SECONDES</label></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="na-section na-white">
        <div className="na-container">
          <div className="na-label" style={{textAlign:"center"}}>VOS QUESTIONS</div>
          <h2 className="na-section-title" style={{textAlign:"center"}}>Questions Fréquentes</h2>
          <p className="na-section-sub" style={{textAlign:"center",margin:"0 auto 48px"}}>
            Tout ce que vous devez savoir avant de rejoindre NEXORA Academy.
          </p>
          <div className="na-faq-list na-fade">
            {[
              {
                q: "À qui s'adresse exactement NEXORA Academy ?",
                a: "NEXORA Academy est conçue pour toute personne souhaitant créer et vendre des produits digitaux depuis l'Afrique — que vous soyez étudiant, salarié, freelance ou entrepreneur débutant. Aucune expérience préalable n'est requise. Si vous êtes motivé et prêt à passer à l'action, ce programme est fait pour vous."
              },
              {
                q: "Je suis débutant complet. Est-ce que je vais vraiment pouvoir suivre ?",
                a: "Absolument. Le programme a été pensé et structuré spécifiquement pour les débutants. Chaque module avance étape par étape, avec des exercices pratiques et des exemples concrets adaptés au contexte africain. Vous n'avez besoin ni de compétences techniques, ni d'un budget important pour commencer."
              },
              {
                q: "Combien de temps faut-il consacrer à la formation ?",
                a: "Quelques heures par semaine suffisent. Les modules sont courts, directs et conçus pour vous permettre d'avancer à votre rythme, même si vous avez un emploi du temps chargé. L'essentiel est la régularité — pas la quantité d'heures passées."
              },
              {
                q: "En combien de temps puis-je réaliser ma première vente ?",
                a: "De nombreux membres réalisent leur première vente dans les 7 à 30 jours suivant le démarrage, en appliquant fidèlement le plan d'action du Module 4. Les résultats varient selon votre implication et votre niveau d'application, mais la méthode a été éprouvée sur le terrain africain."
              },
              {
                q: "Quels types de produits digitaux puis-je créer avec cette formation ?",
                a: "Ebooks, guides pratiques, formations en ligne, templates, checklists, mini-cours audio ou vidéo… Le Module 2 vous accompagne pas à pas dans la création de votre propre produit digital, avec un modèle d'ebook vierge offert pour démarrer immédiatement."
              },
              {
                q: "Est-ce que j'ai besoin d'un site web ou de compétences en informatique ?",
                a: "Non. NEXORA Academy vous apprend à vendre sans site web complexe, grâce à des outils simples et 100 % gratuits comme WhatsApp, TikTok et Facebook. Nous utilisons des plateformes accessibles depuis n'importe quel smartphone."
              },
              {
                q: "Qu'est-ce que le Traffic Analyzer et comment ça fonctionne ?",
                a: "Le Traffic Analyzer est un outil exclusif inclus dans votre accès. Il analyse en temps réel les tendances et la performance des produits digitaux sur le marché, vous permettant d'identifier en quelques secondes les produits les plus rentables du moment — avant même de créer le vôtre."
              },
              {
                q: "Comment fonctionne la garantie satisfait ou remboursé ?",
                a: "Vous bénéficiez d'une garantie totale de 7 jours. Si après avoir suivi les premiers modules vous estimez que la formation ne correspond pas à vos attentes, il vous suffit de nous contacter et nous procédons au remboursement intégral — sans question, sans condition."
              },
              {
                q: "Quelle est la différence entre cette formation et ce qu'on trouve gratuitement sur YouTube ?",
                a: "YouTube offre des informations dispersées, souvent génériques et non adaptées aux réalités africaines. NEXORA Academy est un système complet, structuré et actionnable, avec un accompagnement personnalisé, des sessions de coaching direct et un accès à une communauté VIP. Vous gagnez du temps, évitez les erreurs coûteuses et progressez avec une méthode qui a déjà fait ses preuves."
              },
              {
                q: "Comment rejoindre le programme et accéder au contenu ?",
                a: "Cliquez sur le bouton ci-dessous, complétez votre inscription en quelques minutes, et accédez immédiatement à l'ensemble du contenu — modules, outils, communauté et sessions de coaching. L'accès est instantané, 24h/24 et 7j/7."
              },
            ].map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} index={i} />
            ))}
          </div>
          <div style={{marginTop:40}}>
            <button className="na-btn na-btn-green na-btn-xl na-pulse" onClick={goFormation}>
              REJOINDRE LE PROGRAMME MAINTENANT
            </button>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="na-section na-white" style={{ textAlign: "center" }}>
        <div className="na-container">
          <div className="na-cta-box na-fade">
            <div className="na-badge-pill" style={{ margin: "0 auto 24px" }}>
              <span className="na-dot" /> Commence dès aujourd'hui
            </div>
            <h2 className="na-cta-title">Prêt à créer ton premier revenu en ligne ?</h2>
            <p className="na-cta-sub">
              Rejoins NEXORA Academy maintenant. Simple. Concret. Adapté à la réalité du terrain africain.
            </p>
            <button className="na-btn na-btn-red na-btn-xl na-pulse" onClick={goFormation}>
              ACCÉDER À LA FORMATION MAINTENANT →
            </button>

            {/* ── Crypto CTA ── */}
            {cryptoEnabled && (
              <button
                onClick={() => setCryptoModalOpen(true)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: "10px", width: "100%", maxWidth: 480, margin: "12px auto 0",
                  padding: "14px 24px", borderRadius: 14,
                  border: "2px solid #F3BA2F",
                  background: "#FEF9E7", color: "#92400e",
                  fontWeight: 800, fontSize: 15, cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <svg viewBox="0 0 32 32" width="22" height="22">
                  <circle cx="16" cy="16" r="16" fill="#F3BA2F"/>
                  <path d="M12.116 14.404L16 10.52l3.886 3.886 2.26-2.26L16 6l-6.144 6.144 2.26 2.26zM6 16l2.26-2.26L10.52 16l-2.26 2.26L6 16zm6.116 1.596L16 21.48l3.886-3.886 2.26 2.259L16 26l-6.144-6.144-.003-.003 2.263-2.257zM21.48 16l2.26-2.26L26 16l-2.26 2.26L21.48 16zm-3.188-.002h.002L16 13.706l-1.773 1.773-.001.001-.228.228-.002.003.003-.003.228-.228L16 17.294l2.294-2.294-.002-.002z" fill="white"/>
                </svg>
                <svg viewBox="0 0 32 32" width="22" height="22">
                  <circle cx="16" cy="16" r="16" fill="#26A17B"/>
                  <path d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.127 0 1.053 3.309 1.924 7.709 2.126v7.608h3.913v-7.61c4.393-.202 7.694-1.073 7.694-2.124 0-1.052-3.301-1.923-7.694-2.126" fill="#fff"/>
                </svg>
                Payer en Crypto — USDT / BNB
              </button>
            )}

            {/* ── Modal crypto Nexora Academy ── */}
            <CryptoPaymentModal
              isOpen={cryptoModalOpen}
              onClose={() => setCryptoModalOpen(false)}
              onSuccess={(_paymentId) => {
                setCryptoModalOpen(false);
                // Rediriger vers la formation après paiement confirmé
                window.open(FORMATION_URL, "_blank");
              }}
              wallets={NEXORA_CRYPTO_WALLETS}
              orderId={`NEXORA-ACADEMY-${Date.now()}`}
              productName="NEXORA Academy — Formation complète"
              priceUSD={85}
            />

            <div className="na-trust-row" style={{ marginTop: 28 }}>
              <div className="na-trust-badge">
                <span className="na-trust-icon">⚡</span>
                <span className="na-trust-label">ACCÈS<br/>IMMÉDIAT</span>
              </div>
              <div className="na-trust-sep" />
              <div className="na-trust-badge">
                <span className="na-trust-icon">🛡️</span>
                <span className="na-trust-label">GARANTIE 7 JOURS</span>
              </div>
              <div className="na-trust-sep" />
              <div className="na-trust-badge">
                <span className="na-trust-icon">🔒</span>
                <span className="na-trust-label">PAIEMENT<br/>SÉCURISÉ</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER NOTE ── */}
      <div className="na-footer-note">
        <strong>NEXORA ACADEMY</strong> © 2026 — Tous droits réservés<br />
        <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>
          Ce site ne fait pas partie du site Facebook™ ou Facebook Inc. FACEBOOK™ est une marque de FACEBOOK, Inc.
        </span>
      </div>
    </>
  );
}

// ─── FAQ Item Sub-component ───────────────────────────────────────────────────
function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`na-faq-item ${open ? "na-faq-open" : ""}`} onClick={() => setOpen(!open)}>
      <div className="na-faq-header">
        <span className="na-faq-num">{String(index + 1).padStart(2, "0")}</span>
        <p className="na-faq-q">{q}</p>
        <div className="na-faq-chevron">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d={open ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
          </svg>
        </div>
      </div>
      {open && (
        <div className="na-faq-body">
          <p>{a}</p>
        </div>
      )}
    </div>
  );
}

// ─── Module Card Sub-component ────────────────────────────────────────────────
function ModuleCard({ mod }: { mod: typeof MODULES[0] }) {
  return (
    <div className="na-module-card">
      <div className="na-module-img-wrap">
        <img src={mod.img} alt={mod.title} className="na-module-img" />
      </div>
      <div className="na-module-body">
        <div className="na-module-tag">{mod.tag}</div>
        <h3 className="na-module-title">{mod.title.toUpperCase()}</h3>
        <ul className="na-module-bullets">
          {mod.bullets.map((b, i) => (
            <li key={i}>
              <svg viewBox="0 0 24 24" width="22" height="22" style={{ flexShrink: 0, marginTop: 2 }}>
                <circle cx="12" cy="12" r="10" fill="#e60000" />
                <path d="M10 8l4 4-4 4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span dangerouslySetInnerHTML={{ __html: b }} />
            </li>
          ))}
        </ul>
        <div className="na-red-line" />
        <p className="na-module-footer" dangerouslySetInnerHTML={{ __html: mod.footer }} />
      </div>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&family=Open+Sans:wght@400;500;600&display=swap');

  .na-hero, .na-pack-section, .na-section, .na-footer-note,
  .na-audience-card, .na-error-card, .na-module-card,
  .na-pricing-card, .na-sales-card, .na-steps-row, .na-step,
  .na-badge-pill, .na-trust, .na-cta-box, .na-stagnation-box,
  .na-offer-grid, .na-benefits-list, .na-action-area {
    font-family: 'Open Sans', sans-serif;
  }
  h1, h2, h3, h4, .na-module-tag, .na-label, .na-step-title,
  .na-section-title, .na-hero-h1, .na-offer-title, .na-cta-title,
  .na-sales-title, .na-discount-badge, .na-warning-title {
    font-family: 'Montserrat', sans-serif;
  }

  /* ── Layout ── */
  .na-container { max-width: 1060px; margin: 0 auto; padding: 0 16px; }
  .na-section { padding: 56px 16px; }
  .na-white { background: #fff; }
  .na-light-grey { background: #f4f5f7; }

  /* ── Colors ── */
  .na-red   { color: #e60000; }
  .na-blue  { color: #1a6fff; }
  .na-green { color: #00b37d; }
  .na-gold  { color: #f5a623; }

  /* ── Fade ── */
  .na-fade { opacity: 0; transform: translateY(20px); transition: opacity .6s, transform .6s; }
  .na-visible { opacity: 1; transform: none; }

  /* ── Buttons ── */
  .na-btn {
    display: inline-flex; align-items: center; justify-content: center;
    border: none; cursor: pointer; text-decoration: none;
    font-family: 'Montserrat', sans-serif; font-weight: 900;
    border-radius: 50px; transition: all .25s;
  }
  .na-btn-red {
    background: linear-gradient(135deg, #ff1a1a 0%, #cc0000 100%);
    color: #fff; box-shadow: 0 6px 24px rgba(230,0,0,.35);
  }
  .na-btn-red:hover { filter: brightness(1.1); transform: translateY(-2px); box-shadow: 0 10px 32px rgba(230,0,0,.5); }
  .na-btn-blue {
    background: linear-gradient(135deg, #2979ff 0%, #1a55cc 100%);
    color: #fff; box-shadow: 0 6px 24px rgba(41,121,255,.35);
  }
  .na-btn-blue:hover { filter: brightness(1.1); transform: translateY(-2px); }
  .na-btn-green {
    background: linear-gradient(135deg, #00c98d 0%, #00906a 100%);
    color: #fff; box-shadow: 0 6px 24px rgba(0,179,125,.35);
  }
  .na-btn-green:hover { filter: brightness(1.1); transform: translateY(-2px); }
  .na-btn-purple {
    background: linear-gradient(135deg, #7C3AED, #9D4EDD);
    color: #fff; box-shadow: 0 4px 20px rgba(124,58,237,.45);
    border: none;
  }
  .na-btn-purple:hover {
    background: linear-gradient(135deg, #6D28D9, #8B3FC7);
    box-shadow: 0 6px 25px rgba(124,58,237,.6);
    transform: translateY(-2px);
  }
  .na-btn-xl { padding: 18px 32px; font-size: 1rem; letter-spacing: .5px; width: 100%; }
  @keyframes na-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
  .na-pulse { animation: na-pulse 2s infinite; }

  /* ── Badge pill ── */
  .na-badge-pill {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 16px;
    background: rgba(230,0,0,.08);
    border: 1px solid rgba(230,0,0,.25);
    border-radius: 100px;
    font-size: .82rem; font-weight: 600; color: #e60000;
    margin-bottom: 20px;
  }
  @keyframes na-blink { 0%,100%{opacity:1} 50%{opacity:.3} }
  .na-dot { width:7px; height:7px; border-radius:50%; background:#e60000; animation: na-blink 2s infinite; display:inline-block; }

  /* ── Hero ── */
  .na-hero {
    min-height: auto; display: flex; align-items: center;
    padding: 52px 16px 44px;
    background: #fff;
    position: relative; overflow: hidden;
  }
  .na-hero-bg {
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 70% 60% at 80% 30%, rgba(230,0,0,.06), transparent 65%);
    pointer-events: none;
  }
  .na-hero-inner { position: relative; z-index: 1; width: 100%; }
  .na-hero-h1 { font-size: clamp(2rem,5vw,3.6rem); font-weight: 900; letter-spacing: -1px; margin-bottom: 20px; color: #111; line-height:1.15; }
  .na-hero-sub { font-size: 1rem; color: #555; margin-bottom: 28px; line-height: 1.6; }

  /* ── Trust row ── */
  .na-trust-row {
    display: grid;
    grid-template-columns: 1fr auto 1fr auto 1fr;
    align-items: center;
    margin-top: 28px;
    background: #111; border-radius: 16px;
    padding: 20px 12px;
    width: 100%;
  }
  .na-trust-badge {
    display: flex; flex-direction: column; align-items: center;
    gap: 10px; text-align: center; padding: 0 4px;
  }
  .na-trust-icon { font-size: 2rem; line-height: 1; }
  .na-trust-label {
    font-family: 'Montserrat', sans-serif;
    font-weight: 800; font-size: .7rem;
    color: #fff; text-transform: uppercase;
    letter-spacing: .4px; line-height: 1.35;
  }
  .na-trust-sep {
    width: 1px; height: 52px;
    background: rgba(255,255,255,.18);
    flex-shrink: 0;
  }

  /* ── Pack section ── */
  .na-pack-section { background: #f7f7f7; padding: 60px 20px; text-align: center; }
  .na-pack-inner { display: flex; flex-direction: column; align-items: center; gap: 28px; }
  .na-pack-img { width: 100%; max-width: 800px; height: auto; }
  .na-grey-box {
    background: #ececec; color: #111;
    padding: 28px 36px; border-radius: 20px;
    max-width: 720px; font-size: clamp(1rem,3vw,1.3rem);
    line-height: 1.5; text-align: center;
  }
  .na-pack-text { color: #555; font-size: 1rem; max-width: 640px; text-align: center; line-height: 1.6; }

  /* ── Section titles ── */
  .na-label { font-size: .78rem; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #e60000; margin-bottom: 10px; }
  .na-section-title { font-size: clamp(1.6rem,4vw,2.4rem); font-weight: 900; letter-spacing: -.5px; margin-bottom: 14px; color: #111; line-height: 1.15; }
  .na-section-sub { color: #666; font-size: 1rem; margin-bottom: 36px; line-height: 1.6; }

  /* ── Audience ── */
  .na-audience-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 16px; }
  .na-audience-card { background: #fff; border: 1.5px solid #f0f0f0; border-radius: 14px; padding: 28px 22px; text-align: center; transition: border-color .2s, box-shadow .2s; }
  .na-audience-card:hover { border-color: #e60000; box-shadow: 0 4px 20px rgba(230,0,0,.08); }
  .na-audience-emoji { font-size: 2.2rem; margin-bottom: 10px; }
  .na-audience-role { font-family:'Montserrat',sans-serif; font-weight: 700; font-size: .95rem; margin-bottom: 8px; color: #111; }
  .na-audience-desc { font-size: .84rem; color: #666; }

  /* ── Errors ── */
  .na-errors-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(260px,1fr)); gap: 14px; margin-bottom: 32px; }
  .na-error-card { background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 20px 22px; display: flex; align-items: flex-start; gap: 12px; }
  .na-error-icon { font-size: 1.2rem; flex-shrink:0; margin-top:2px; }
  .na-error-text { font-size: .9rem; color: #555; line-height:1.5; margin:0; }
  .na-stagnation-box {
    background: #e60000; color: #fff;
    border-radius: 14px; padding: 24px 32px;
    text-align: center; font-size: 1.05rem; line-height:1.6;
    max-width: 700px; margin: 0 auto;
  }

  /* ── Steps ── */
  .na-steps-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 2px; border-radius: 14px; overflow:hidden; border: 1px solid #eee; }
  .na-step { background: #fff; padding: 36px 28px; border-right: 1px solid #eee; }
  .na-step:last-child { border-right: none; }
  .na-step-num { font-family:'Montserrat',sans-serif; font-size: 3rem; font-weight: 900; color: rgba(230,0,0,.15); line-height:1; margin-bottom:14px; }
  .na-step-title { font-family:'Montserrat',sans-serif; font-size: 1rem; font-weight: 700; color: #e60000; margin-bottom:8px; }
  .na-step-desc { font-size: .88rem; color: #666; line-height:1.55; }

  /* ── Module Cards ── */
  .na-modules-grid-2 { display: grid; grid-template-columns: repeat(2,1fr); gap: 24px; }
  .na-module5-wrap { display: flex; justify-content: center; }
  .na-module5-wrap .na-module-card { max-width: 500px; width:100%; }

  .na-module-card {
    background: #1e1e2e;
    border-radius: 32px;
    overflow: visible;
    position: relative;
    padding: 0 28px 36px;
    box-shadow: 0 20px 40px rgba(0,0,0,.18);
  }
  .na-module-img-wrap {
    position: relative;
    margin-top: -40px;
    margin-bottom: 20px;
    z-index: 2;
    display: flex; justify-content: center;
  }
  .na-module-img { width: 110%; height: auto; filter: drop-shadow(0 16px 28px rgba(0,0,0,.6)); max-width: 420px; }
  .na-module-tag {
    display: inline-block;
    background: #e60000; color: #fff;
    padding: 7px 22px; border-radius: 50px;
    font-family:'Montserrat',sans-serif; font-weight:900; font-size:.82rem;
    text-transform: uppercase; margin-bottom:14px;
  }
  .na-module-title { color: #e60000; font-size: 1.1rem; font-weight:900; text-transform:uppercase; margin-bottom:20px; line-height:1.2; }
  .na-module-bullets { list-style:none; padding:0; margin:0; }
  .na-module-bullets li { display:flex; gap:12px; align-items:flex-start; margin-bottom:18px; color:#eee; font-size:.9rem; line-height:1.5; }
  .na-red-line { height:2px; background:#e60000; opacity:.7; margin:20px 0; }
  .na-module-footer { color:#aaa; font-size:.88rem; line-height:1.55; }

  /* ── Offer Grid ── */
  .na-offer-grid { display:grid; grid-template-columns:1fr 1fr; gap:40px; align-items:start; }
  .na-offer-pretitle { font-size:.95rem; margin-bottom:8px; color:#555; }
  .na-offer-title { color:#e60000; font-size:1.6rem; font-weight:900; margin:0 0 4px; }
  .na-red-divider { width:50px; height:4px; background:#e60000; border-radius:2px; margin:14px 0 26px; }
  .na-modules-list { list-style:none; padding:0; }
  .na-modules-list li { display:flex; align-items:center; gap:14px; margin-bottom:22px; font-size:.93rem; color:#333; line-height:1.3; }
  .na-grad-icon { font-size:1.4rem; filter:drop-shadow(0 0 4px rgba(230,0,0,.4)); }

  .na-pricing-card {
    background:#fff; border-radius:24px;
    padding:36px 28px; text-align:center;
    border:1.5px solid #f0f0f0;
    box-shadow:0 16px 40px rgba(0,0,0,.1);
  }
  .na-discount-badge { color:#e60000; font-family:'Montserrat',sans-serif; font-size:1.6rem; font-weight:900; margin-bottom:4px; }
  .na-immediate { text-transform:uppercase; font-weight:700; font-size:.82rem; color:#555; margin-bottom:20px; }
  .na-warning-title { color:#e60000; font-size:1.1rem; font-weight:900; margin-bottom:8px; }
  .na-warning-text { font-size:.88rem; color:#666; margin-bottom:20px; line-height:1.5; }
  .na-stack-img { width:100%; max-width:260px; height:auto; margin-bottom:16px; }
  .na-price-display { margin-bottom:20px; }
  .na-price-current { font-family:'Montserrat',sans-serif; font-size:2.8rem; font-weight:900; display:block; color:#111; }
  .na-price-label { font-size:.78rem; color:#999; margin:10px 0 4px; text-transform:uppercase; }
  .na-price-old { font-family:'Montserrat',sans-serif; font-size:1.4rem; font-weight:900; color:#e60000; text-decoration:line-through; }
  .na-pricing-footer { text-align:left; border-top:1px solid #f0f0f0; padding-top:16px; margin:16px 0 20px; }
  .na-footer-row { display:flex; gap:8px; margin-bottom:10px; }
  .na-rbullet { color:#e60000; font-size:.7rem; margin-top:4px; flex-shrink:0; }
  .na-footer-row p { font-size:.82rem; color:#777; line-height:1.5; margin:0; }

  /* ── Sales Card ── */
  .na-sales-title {
    text-align:center;
    color:#e60000; font-size:clamp(1.1rem,3vw,1.4rem);
    font-weight:900; text-decoration:underline;
    margin-bottom:36px; line-height:1.4; max-width:760px; margin-left:auto; margin-right:auto;
  }
  .na-sales-card {
    background:#fff; border-radius:20px;
    max-width:620px; margin:0 auto;
    padding:36px 28px;
    box-shadow:0 12px 32px rgba(0,0,0,.1);
    border:1px solid #eee;
  }
  .na-benefits-list { list-style:none; padding:0; margin:0 0 28px; }
  .na-list-header {
    font-family:'Montserrat',sans-serif; font-weight:900;
    color:#e60000; font-size:.82rem; text-transform:uppercase;
    margin:24px 0 12px; border-bottom:1.5px solid #f0f0f0; padding-bottom:6px;
  }
  .na-benefit-item { display:flex; align-items:flex-start; gap:12px; margin-bottom:14px; font-size:.9rem; color:#333; line-height:1.5; }
  .na-check-icon {
    width:20px; height:20px; min-width:20px;
    background:#e60000; border-radius:50%;
    margin-top:2px; position:relative; display:flex; flex-shrink:0;
  }
  .na-check-icon::after {
    content:''; position:absolute;
    left:7px; top:4px; width:4px; height:8px;
    border:solid white; border-width:0 2px 2px 0;
    transform:rotate(45deg);
  }
  .na-action-area { border-top:1.5px solid #f0f0f0; padding-top:24px; text-align:center; }
  .na-instruction { font-weight:700; font-size:.78rem; color:#888; margin-bottom:18px; text-transform:uppercase; }
  .na-price-box { margin-bottom:24px; }
  .na-old-price { font-size:1rem; color:#999; margin-bottom:4px; }
  .na-offer-label { color:#111; font-family:'Montserrat',sans-serif; font-weight:900; font-size:1rem; margin:0; }
  .na-big-price { color:#e60000; font-family:'Montserrat',sans-serif; font-size:3rem; font-weight:900; margin:6px 0; }
  .na-savings { font-size:.88rem; font-weight:700; color:#e60000; margin-bottom:4px; }
  .na-warning-places { font-size:.82rem; color:#555; margin:14px 0 20px; }

  /* ── Countdown ── */
  .na-countdown {
    display:flex; justify-content:center; gap:16px;
    border-top:1px solid #f0f0f0; padding-top:22px;
  }
  .na-cd-unit { display:flex; flex-direction:column; align-items:center; width:64px; }
  .na-cd-num { font-family:'Montserrat',sans-serif; font-size:2rem; font-weight:900; color:#e60000; line-height:1; }
  .na-cd-unit label { font-size:.65rem; font-weight:700; color:#999; margin-top:4px; letter-spacing:1px; }

  /* ── CTA box ── */
  .na-cta-box {
    background:#fff; border:1.5px solid #f0f0f0;
    border-radius:24px; padding:52px 24px;
    box-shadow:0 12px 40px rgba(0,0,0,.08);
    width: 100%;
  }
  .na-cta-title { font-size:clamp(1.5rem,4vw,2.4rem); font-weight:900; margin-bottom:14px; color:#111; text-align:left; }
  .na-cta-sub { color:#666; font-size:1rem; margin:0 0 32px; line-height:1.6; text-align:left; }

  /* ── Footer note ── */
  .na-footer-note {
    background: #f0f0f0; color: #666;
    text-align:center; padding:28px 16px;
    font-size:.82rem; line-height:1.8;
  }
  .na-footer-note strong { color: #333; font-family:'Montserrat',sans-serif; }

  /* ── Sticky urgency bar ── */
  .na-sticky-bar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 999;
    background: linear-gradient(135deg, #cc0000 0%, #ff1a1a 100%);
    color: #fff; display: flex; align-items: center; justify-content: center;
    gap: 10px; padding: 10px 16px; font-size: .82rem; font-weight: 600;
    flex-wrap: wrap; text-align: center;
    box-shadow: 0 2px 12px rgba(230,0,0,.4);
  }
  .na-sticky-fire { font-size: 1.1rem; }
  .na-sticky-countdown {
    font-family: 'Montserrat', sans-serif; font-weight: 900;
    font-size: 1rem; letter-spacing: 2px;
    background: rgba(0,0,0,.25); border-radius: 6px;
    padding: 2px 10px;
  }
  .na-sticky-btn {
    background: #fff; color: #cc0000;
    border: none; cursor: pointer;
    font-family: 'Montserrat', sans-serif; font-weight: 900;
    font-size: .75rem; padding: 6px 14px; border-radius: 20px;
    transition: transform .2s;
    white-space: nowrap;
  }
  .na-sticky-btn:hover { transform: scale(1.05); }

  /* ── Progress bar ── */
  .na-progress-bar {
    position: fixed; top: 40px; left: 0; height: 3px; width: 0%;
    background: linear-gradient(90deg, #e60000, #ff6b6b);
    z-index: 998; transition: width .1s linear;
    border-radius: 0 2px 2px 0;
  }

  /* ── Float CTA (mobile only) ── */
  .na-float-cta {
    display: none;
    position: fixed; bottom: 16px; left: 16px; right: 16px;
    z-index: 997;
    filter: drop-shadow(0 4px 16px rgba(124,58,237,.4));
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .na-float-cta { display: block; }

    /* Hero padding adapté à la nouvelle hauteur de la sticky bar */
    .na-hero { padding-top: 80px; }

    /* ── STICKY BAR RÉDUITE sur mobile ── */
    .na-sticky-bar {
      font-size: .70rem;
      gap: 4px;
      padding: 5px 8px;
    }
    .na-sticky-fire {
      font-size: .9rem;
    }
    .na-sticky-countdown {
      font-size: .82rem;
      padding: 1px 6px;
      letter-spacing: 1px;
    }
    .na-sticky-btn {
      font-size: .68rem;
      padding: 4px 10px;
    }

    /* Progress bar ajustée à la nouvelle hauteur sticky */
    .na-progress-bar {
      top: 30px;
    }

    .na-modules-grid-2 { grid-template-columns:1fr; }
    .na-offer-grid { grid-template-columns:1fr; }
    .na-steps-row { grid-template-columns:1fr; }
    .na-step { border-right:none; border-bottom:1px solid #eee; }
    .na-module-img-wrap { margin-top:-30px; }
    .na-cta-box { padding:32px 16px; }
  }

  /* ── FAQ ── */
  .na-faq-list { display:flex; flex-direction:column; gap:12px; width:100%; }
  .na-faq-item {
    border:1.5px solid #eee; border-radius:16px;
    overflow:hidden; cursor:pointer;
    transition: border-color .2s, box-shadow .2s;
    background:#fff;
  }
  .na-faq-item:hover { border-color:#e60000; box-shadow:0 4px 20px rgba(230,0,0,.08); }
  .na-faq-open { border-color:#e60000; box-shadow:0 4px 20px rgba(230,0,0,.1); }
  .na-faq-header {
    display:flex; align-items:center; gap:16px;
    padding:20px 24px;
  }
  .na-faq-num {
    font-family:'Montserrat',sans-serif; font-weight:900;
    font-size:.78rem; color:#e60000;
    background:rgba(230,0,0,.08); border-radius:8px;
    padding:4px 10px; flex-shrink:0;
  }
  .na-faq-q {
    flex:1; font-family:'Montserrat',sans-serif;
    font-weight:700; font-size:.95rem;
    color:#111; margin:0; line-height:1.4;
  }
  .na-faq-chevron {
    width:32px; height:32px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    border-radius:50%; background:#f5f5f5; color:#e60000;
    transition:background .2s;
  }
  .na-faq-open .na-faq-chevron { background:rgba(230,0,0,.1); }
  .na-faq-body {
    padding:0 24px 22px 66px;
    animation: na-faq-in .2s ease;
  }
  @keyframes na-faq-in { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none} }
  .na-faq-body p {
    font-size:.92rem; color:#555; line-height:1.7; margin:0;
    border-top:1px solid #f0f0f0; padding-top:16px;
  }
  @media (max-width:768px) {
    .na-faq-body { padding:0 16px 18px 16px; }
    .na-faq-header { padding:16px; gap:12px; }
    .na-faq-q { font-size:.88rem; }
  }

  /* ── Traffic Analyzer ── */
  .na-ta-main-title {
    font-family: 'Montserrat', sans-serif;
    font-weight: 900; font-size: clamp(1.4rem,4vw,2rem);
    text-transform: uppercase; text-align: left;
    color: #111; line-height: 1.2; margin-bottom: 28px;
  }
  .na-ta-intro {
    font-size: 1.1rem; line-height: 1.55;
    color: #333; margin-bottom: 28px; text-align: left;
  }
  .na-ta-pouvoir-title {
    font-family: 'Montserrat', sans-serif;
    font-weight: 900; font-size: 1.4rem;
    color: #e60000; text-transform: uppercase;
    margin-bottom: 20px; text-align: left;
  }
  .na-ta-img-box { background: #fff; border-radius: 14px; padding: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.08); }
  .na-ta-img { width: 100%; height: auto; display: block; border-radius: 6px; }
  .na-ta-list { list-style: none; padding: 0; margin: 0; }
  .na-ta-list li { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 22px; }
  .na-ta-list p { font-size: 1rem; line-height: 1.6; margin: 0; color: #333; }
  .na-ta-grid { display: block; }
  .na-ta-powers-grid { display: block; }

  /* ── ET TOUT ÇA ── */
  .na-etc-grid { display:flex; flex-direction:column; gap:20px; margin-bottom:8px; }
  .na-etc-item { display:flex; align-items:flex-start; gap:16px; }
  .na-etc-icon { width:52px; height:52px; min-width:52px; display:flex; align-items:center; justify-content:center; flex-shrink:0; padding:6px; }

  /* ── Avant / Après ── */
  .na-aa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  @media (max-width: 768px) { .na-aa-grid { grid-template-columns: 1fr; } }
  .na-aa-card { border-radius: 20px; padding: 28px 24px; }
  .na-aa-before { background: #fff5f5; border: 2px solid #ffd0d0; }
  .na-aa-after  { background: #f0fff8; border: 2px solid #b3f0d8; }
  .na-aa-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  .na-aa-emoji  { font-size: 1.6rem; }
  .na-aa-title  {
    font-family: 'Montserrat', sans-serif; font-weight: 900;
    font-size: 1rem; margin: 0;
  }
  .na-aa-before .na-aa-title { color: #cc0000; }
  .na-aa-after  .na-aa-title { color: #00906a; }
  .na-aa-list { list-style: none; padding: 0; margin: 0; }
  .na-aa-list li { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 14px; font-size: .9rem; line-height: 1.5; color: #444; }
  .na-aa-icon-bad  { font-weight: 900; color: #cc0000; flex-shrink: 0; margin-top: 1px; font-size: 1rem; }
  .na-aa-icon-good { font-weight: 900; color: #00906a; flex-shrink: 0; margin-top: 1px; font-size: 1rem; }

  /* ── Témoignages ── */
  .na-testi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
  .na-testi-card {
    background: #fff; border-radius: 20px;
    padding: 28px 24px;
    border: 1.5px solid #f0f0f0;
    box-shadow: 0 8px 28px rgba(0,0,0,.07);
    display: flex; flex-direction: column; gap: 14px;
  }
  .na-testi-stars { font-size: 1rem; letter-spacing: 2px; }
  .na-testi-text { font-size: .92rem; color: #444; line-height: 1.7; margin: 0; font-style: italic; flex: 1; }
  .na-testi-result {
    display: flex; align-items: center; gap: 8px;
    background: linear-gradient(135deg, #fff8e1, #fff3cc);
    border: 1px solid #f5a623;
    border-radius: 8px; padding: 8px 14px;
    font-family: 'Montserrat', sans-serif;
    font-weight: 800; font-size: .82rem; color: #b07800;
  }
  .na-testi-result-icon { font-size: 1rem; }
  .na-testi-footer { display: flex; align-items: center; gap: 12px; padding-top: 12px; border-top: 1px solid #f0f0f0; }
  .na-testi-avatar { font-size: 2rem; width: 44px; height: 44px; border-radius: 50%; background: #f4f5f7; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .na-testi-name { font-family: 'Montserrat', sans-serif; font-weight: 700; font-size: .88rem; color: #111; }
  .na-testi-city { font-size: .78rem; color: #888; }

  /* ── Garantie ── */
  .na-guarantee-box {
    display: flex; align-items: center; gap: 32px;
    background: linear-gradient(135deg, #f0fff8 0%, #e8f5ff 100%);
    border: 2px solid #00b37d; border-radius: 24px;
    padding: 40px 36px;
  }
  @media (max-width: 768px) {
    .na-guarantee-box { flex-direction: column; padding: 28px 20px; gap: 20px; text-align: center; }
  }
  .na-guarantee-badge {
    display: flex; flex-direction: column; align-items: center;
    background: #fff; border-radius: 20px;
    padding: 20px 24px; flex-shrink: 0;
    box-shadow: 0 8px 24px rgba(0,179,125,.2);
    border: 2px solid #00b37d;
    min-width: 110px;
  }
  .na-guarantee-shield { font-size: 2.4rem; margin-bottom: 4px; }
  .na-guarantee-days {
    font-family: 'Montserrat', sans-serif; font-weight: 900;
    font-size: 3rem; color: #00906a; line-height: 1;
  }
  .na-guarantee-label {
    font-family: 'Montserrat', sans-serif; font-weight: 800;
    font-size: .7rem; color: #00906a; text-transform: uppercase; letter-spacing: 2px;
  }
  .na-guarantee-content { flex: 1; }
  .na-guarantee-title {
    font-family: 'Montserrat', sans-serif; font-weight: 900;
    font-size: 1.3rem; color: #006644; margin-bottom: 14px;
  }
  .na-guarantee-text { font-size: .95rem; color: #444; line-height: 1.7; margin: 0; }
`;
