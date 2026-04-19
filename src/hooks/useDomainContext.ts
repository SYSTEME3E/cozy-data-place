// src/hooks/useDomainContext.ts
// Détecte si la page est servie depuis un domaine personnalisé
// et retourne les infos de la page à afficher

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface DomainContext {
  isCustomDomain: boolean;
  pageType: "boutique" | "immobilier" | "tunnel" | null;
  pageSlug: string | null;
  hostname: string | null;
}

declare global {
  interface Window {
    __NEXORA_DOMAIN_CONTEXT__?: {
      page_type: string;
      page_slug: string;
      hostname: string;
    };
  }
}

const NEXORA_HOSTNAMES = [
  "app.nexora.com",
  "nexora.com",
  "localhost",
  "127.0.0.1",
];

export function useDomainContext(): DomainContext {
  const [context, setContext] = useState<DomainContext>({
    isCustomDomain: false,
    pageType: null,
    pageSlug: null,
    hostname: null,
  });

  useEffect(() => {
    const hostname = window.location.hostname;

    // Vérifier si on est sur un domaine personnalisé
    const isCustom = !NEXORA_HOSTNAMES.some(h => hostname === h || hostname.endsWith(`.${h}`));

    if (!isCustom) {
      setContext({ isCustomDomain: false, pageType: null, pageSlug: null, hostname });
      return;
    }

    // Lire le contexte injecté par le serveur
    if (window.__NEXORA_DOMAIN_CONTEXT__) {
      const ctx = window.__NEXORA_DOMAIN_CONTEXT__;
      setContext({
        isCustomDomain: true,
        pageType: ctx.page_type as any,
        pageSlug: ctx.page_slug || null,
        hostname,
      });
      return;
    }

    // Fallback : interroger l'API de résolution
    const apiUrl = import.meta.env.VITE_DOMAIN_API_URL || "http://localhost:3001";
    fetch(`${apiUrl}/resolve/${hostname}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setContext({
            isCustomDomain: true,
            pageType: data.page_type,
            pageSlug: data.page_slug || null,
            hostname,
          });
        }
      })
      .catch(() => {});
  }, []);

  return context;
}

// ── Composant de redirection automatique basé sur le domaine ──

export function DomainContextRouter() {
  const navigate = useNavigate();
  const ctx = useDomainContext();

  useEffect(() => {
    if (!ctx.isCustomDomain || !ctx.pageType) return;

    const routes: Record<string, string> = {
      boutique:   `/shop/${ctx.pageSlug || ""}`,
      immobilier: `/immo/${ctx.pageSlug || ""}`,
      tunnel:     `/funnel/${ctx.pageSlug || ""}`,
    };

    const route = routes[ctx.pageType];
    if (route && window.location.pathname === "/") {
      navigate(route, { replace: true });
    }
  }, [ctx, navigate]);

  return null;
}
