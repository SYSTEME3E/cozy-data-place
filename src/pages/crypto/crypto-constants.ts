// ─── CONSTANTS ────────────────────────────────────────────────────────────────
export const ADMIN_CODE = "5523";

export const C = {
  bg:      "#06090f",
  bgCard:  "#0d1526",
  bgCard2: "#111e35",
  border:  "#1a2d4d",
  gold:    "#f59e0b",
  goldD:   "#d97706",
  green:   "#10b981",
  red:     "#ef4444",
  blue:    "#3b82f6",
  purple:  "#8b5cf6",
  cyan:    "#06b6d4",
  text:    "#e2e8f0",
  muted:   "#64748b",
  sidebar: "#04070e",
};

export const CRYPTOS = [
  { id:"usdt_trc20", name:"USDT TRC20", symbol:"USDT", network:"TRON",    color:"#26a17b", icon:"₮", addrRegex:/^T[A-Za-z1-9]{33}$/,           addrEx:"TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" },
  { id:"usdt_bep20", name:"USDT BEP20", symbol:"USDT", network:"BSC",     color:"#f0b90b", icon:"₮", addrRegex:/^0x[0-9a-fA-F]{40}$/,           addrEx:"0x..." },
  { id:"bnb",        name:"BNB",        symbol:"BNB",  network:"BSC",     color:"#f0b90b", icon:"Ⓑ", addrRegex:/^0x[0-9a-fA-F]{40}$/,           addrEx:"0x..." },
  { id:"eth",        name:"Ethereum",   symbol:"ETH",  network:"ERC20",   color:"#627eea", icon:"Ξ", addrRegex:/^0x[0-9a-fA-F]{40}$/,           addrEx:"0x..." },
  { id:"btc",        name:"Bitcoin",    symbol:"BTC",  network:"BTC",     color:"#f7931a", icon:"₿", addrRegex:/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/, addrEx:"bc1..." },
  { id:"matic",      name:"Polygon",    symbol:"MATIC",network:"POLYGON", color:"#8247e5", icon:"⬡", addrRegex:/^0x[0-9a-fA-F]{40}$/,           addrEx:"0x..." },
];

export const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label:"En attente de paiement",   color:"#f59e0b", bg:"rgba(245,158,11,0.15)" },
  paid:      { label:"Paiement déclaré",          color:"#3b82f6", bg:"rgba(59,130,246,0.15)" },
  confirmed: { label:"Confirmé — Crypto envoyée", color:"#10b981", bg:"rgba(16,185,129,0.15)" },
  disputed:  { label:"Litige",                    color:"#ef4444", bg:"rgba(239,68,68,0.15)" },
};

export const SELLER_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  active:     { label:"Actif",     color:"#10b981", bg:"rgba(16,185,129,0.15)" },
  restricted: { label:"Restreint", color:"#f59e0b", bg:"rgba(245,158,11,0.15)" },
  blocked:    { label:"Bloqué",    color:"#ef4444", bg:"rgba(239,68,68,0.15)" },
};

export const fmt  = (n: number) => Math.round(n).toLocaleString("fr-FR");
export const getCr = (id: string) => CRYPTOS.find(c => c.id === id) || CRYPTOS[0];
export const uid  = () => `u_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;

export const makeStyles = () => ({
  card: { background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:16, padding:22 } as React.CSSProperties,
  card2: { background:C.bgCard2, border:`1px solid ${C.border}`, borderRadius:16, padding:22 } as React.CSSProperties,
  btn: (v="primary", sz="md") => ({
    primary:   { background:`linear-gradient(135deg,${C.gold},${C.goldD})`, color:"#000", fontWeight:700, border:"none", cursor:"pointer", borderRadius:10, padding:sz==="sm"?"7px 14px":"11px 22px", fontSize:sz==="sm"?13:14, display:"inline-flex", alignItems:"center", gap:6, transition:"opacity 0.2s" },
    secondary: { background:"rgba(255,255,255,0.05)", color:C.text, fontWeight:600, border:`1px solid ${C.border}`, cursor:"pointer", borderRadius:10, padding:sz==="sm"?"7px 14px":"11px 22px", fontSize:sz==="sm"?13:14, display:"inline-flex", alignItems:"center", gap:6, transition:"opacity 0.2s" },
    green:     { background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontWeight:700, border:"none", cursor:"pointer", borderRadius:10, padding:sz==="sm"?"7px 14px":"11px 22px", fontSize:sz==="sm"?13:14, display:"inline-flex", alignItems:"center", gap:6 },
    red:       { background:"linear-gradient(135deg,#ef4444,#dc2626)", color:"#fff", fontWeight:700, border:"none", cursor:"pointer", borderRadius:10, padding:sz==="sm"?"7px 14px":"11px 22px", fontSize:sz==="sm"?13:14, display:"inline-flex", alignItems:"center", gap:6 },
    cyan:      { background:"linear-gradient(135deg,#06b6d4,#0891b2)", color:"#fff", fontWeight:700, border:"none", cursor:"pointer", borderRadius:10, padding:sz==="sm"?"7px 14px":"11px 22px", fontSize:sz==="sm"?13:14, display:"inline-flex", alignItems:"center", gap:6 },
    ghost:     { background:"transparent", color:C.muted, fontWeight:500, border:"none", cursor:"pointer", borderRadius:10, padding:sz==="sm"?"7px 14px":"11px 22px", fontSize:sz==="sm"?13:14, display:"inline-flex", alignItems:"center", gap:6 },
    danger:    { background:"rgba(239,68,68,0.1)", color:C.red, fontWeight:600, border:`1px solid rgba(239,68,68,0.3)`, cursor:"pointer", borderRadius:10, padding:sz==="sm"?"7px 14px":"11px 22px", fontSize:sz==="sm"?13:14, display:"inline-flex", alignItems:"center", gap:6 },
  }[v]||{}) as React.CSSProperties,
  input: { background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:10, padding:"11px 14px", color:C.text, fontSize:14, width:"100%", outline:"none", boxSizing:"border-box" as const } as React.CSSProperties,
  label: { display:"block", fontSize:13, fontWeight:600, marginBottom:6, color:C.muted } as React.CSSProperties,
});

// Types for crypto P2P
export interface CryptoAccount {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  isSeller: boolean;
  sellerStatus: string;
  paymentInfo: { reseau: string; numero: string; lienPaiement: string };
  sellerLimits: { reserve: number; maxSell: number; minSell: number };
  whatsapp: string;
  allowedCountries?: string[];
}

export interface CryptoOffer {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  crypto: string;
  rate: number;
  minAmount: number;
  maxAmount: number;
  available: number;
  networkFee: number;
  paymentMethods: string[];
  completedTrades: number;
  createdAt: string;
  allowedCountries?: string[];
}

export interface CryptoOrder {
  id: string;
  crypto: string;
  amount: number;
  amountFCFA: number;
  networkFee: number;
  totalFCFA: number;
  walletAddr: string;
  seller: string;
  sellerId: string;
  buyerId: string;
  buyerName: string;
  buyerWhatsapp: string;
  paymentMessage: string;
  status: string;
  createdAt: string;
  buyerCountry?: string;
}

import React from "react";
