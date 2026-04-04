// ─── CryptoSharedComponents.tsx ──────────────────────────────────────────────
// Composants partagés — SidebarLayout, hamburger 3 barres, mode sombre bleu nuit
import { useState } from "react";
import { C } from "./crypto-constants";

// Palette bleu nuit renforcée
const NIGHT = {
  sidebar:   "#020812",
  sidebarBg: "linear-gradient(180deg, #020d1f 0%, #040c1a 50%, #020812 100%)",
  header:    "rgba(2,8,18,0.98)",
  navItem:   "rgba(255,255,255,0.04)",
  navActive: "rgba(245,158,11,0.13)",
  accent:    "#1a3560",
};

// ─── HAMBURGER 3 BARRES ───────────────────────────────────────────────────────
export function Ham({ onClick, open }: { onClick: () => void; open?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label="Menu"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: `1px solid rgba(255,255,255,0.1)`,
        cursor: "pointer",
        padding: "0",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        gap: 5,
        alignItems: "center",
        justifyContent: "center",
        width: 44,
        height: 44,
        flexShrink: 0,
        transition: "background 0.2s, box-shadow 0.2s",
        boxShadow: open ? `0 0 0 2px rgba(245,158,11,0.4)` : "none",
      }}
    >
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          display: "block",
          width: i === 1 ? 14 : 20,
          height: 2.5,
          borderRadius: 2,
          background: open ? C.gold : C.text,
          transition: "all 0.25s ease",
          opacity: open && i === 1 ? 0.5 : 1,
        }}/>
      ))}
    </button>
  );
}

// ─── SIDEBAR LAYOUT ───────────────────────────────────────────────────────────
export function SidebarLayout({ user, onLogout, navigate, active, setActive, menu, title, children }: any) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:C.bg }}>
      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:199, backdropFilter:"blur(4px)" }}
        />
      )}

      {/* Sidebar — bleu nuit profond */}
      <aside style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        zIndex: 200,
        width: 260,
        background: NIGHT.sidebarBg,
        borderRight: `1px solid rgba(26,53,96,0.6)`,
        display: "flex",
        flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.28s cubic-bezier(.4,0,.2,1)",
        overflowY: "auto",
        boxShadow: open ? "4px 0 32px rgba(0,0,0,0.6)" : "none",
      }}>
        {/* Logo */}
        <div style={{ padding:"20px 18px 16px", borderBottom:`1px solid rgba(26,53,96,0.4)`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, background:`linear-gradient(135deg,${C.gold},${C.goldD})`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:16, color:"#000", boxShadow:`0 0 16px rgba(245,158,11,0.35)` }}>₿</div>
            <span style={{ fontWeight:900, fontSize:18, background:`linear-gradient(135deg,${C.gold},#fbbf24)`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>CryptoP2P</span>
          </div>
          <button onClick={() => setOpen(false)} style={{ background:"rgba(255,255,255,0.06)", border:"none", cursor:"pointer", color:C.muted, fontSize:16, padding:"4px 8px", borderRadius:8, lineHeight:1 }}>✕</button>
        </div>

        {/* User card */}
        <div style={{ padding:"16px 18px", borderBottom:`1px solid rgba(26,53,96,0.4)` }}>
          <div style={{ display:"flex", alignItems:"center", gap:11 }}>
            <div style={{ width:42, height:42, borderRadius:"50%", background:`linear-gradient(135deg,${C.gold},${C.goldD})`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:16, color:"#000", flexShrink:0, overflow:"hidden", border:`2px solid rgba(245,158,11,0.4)` }}>
              {user?.avatar ? <img src={user.avatar} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : (user?.name?.[0] || "U")}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:13.5, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.name}</div>
              <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                {user?.isAdmin ? "🛡️ Administrateur" : user?.isSeller ? "🏪 Vendeur" : "🛒 Acheteur"}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex:1, padding:"12px 10px" }}>
          {menu.map((item: any) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActive(item.id); setOpen(false); }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "11px 13px",
                  borderRadius: 11,
                  border: "none",
                  cursor: "pointer",
                  marginBottom: 3,
                  fontSize: 13.5,
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? NIGHT.navActive : "transparent",
                  color: isActive ? C.gold : C.muted,
                  borderLeft: `3px solid ${isActive ? C.gold : "transparent"}`,
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize:17, flexShrink:0 }}>{item.icon}</span>
                <span style={{ flex:1 }}>{item.label}</span>
                {item.badge > 0 && (
                  <span style={{ background:C.red, color:"#fff", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:100, minWidth:18, textAlign:"center" }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding:"10px 10px 22px", borderTop:`1px solid rgba(26,53,96,0.4)` }}>
          {!user?.isAdmin && (
            <button
              onClick={() => { navigate("marketplace"); setOpen(false); }}
              style={{ width:"100%", textAlign:"left", display:"flex", alignItems:"center", gap:11, padding:"10px 13px", borderRadius:11, border:"none", cursor:"pointer", marginBottom:4, fontSize:13, fontWeight:500, background:"transparent", color:C.muted, transition:"color 0.15s" }}
            >
              <span style={{ fontSize:16 }}>🛒</span><span>Marketplace</span>
            </button>
          )}
          <button
            onClick={onLogout}
            style={{ width:"100%", textAlign:"left", display:"flex", alignItems:"center", gap:11, padding:"10px 13px", borderRadius:11, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, background:"rgba(239,68,68,0.06)", color:C.red, borderLeft:`3px solid transparent` }}
          >
            <span style={{ fontSize:16 }}>🚪</span><span>Retour Nexora</span>
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        {/* Header */}
        <header style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: NIGHT.header,
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid rgba(26,53,96,0.5)`,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          gap: 14,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:13 }}>
            <Ham onClick={() => setOpen(true)} open={open}/>
            <h1 style={{ fontSize:15.5, fontWeight:800, margin:0, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
              {title}
            </h1>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
            <div style={{ textAlign:"right", display:"none" as any }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{user?.name}</div>
              <div style={{ fontSize:11, color:C.muted }}>{user?.isAdmin ? "Admin" : user?.isSeller ? "Vendeur" : "Acheteur"}</div>
            </div>
            <div style={{ width:36, height:36, borderRadius:"50%", background:`linear-gradient(135deg,${C.gold},${C.goldD})`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:13, color:"#000", overflow:"hidden", border:`2px solid rgba(245,158,11,0.3)` }}>
              {user?.avatar ? <img src={user.avatar} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : (user?.name?.[0] || "U")}
            </div>
          </div>
        </header>

        {/* Main */}
        <main style={{ flex:1, padding:"24px 20px", maxWidth:1080, width:"100%", margin:"0 auto", boxSizing:"border-box" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

// ─── TOP NAV pour marketplace ─────────────────────────────────────────────────
export function TopNav({ navigate, user, onLogout }: any) {
  const btnSm = (v: string) => {
    const base = { fontWeight:600, border:"none", cursor:"pointer", borderRadius:10, padding:"7px 14px", fontSize:13, display:"inline-flex", alignItems:"center", gap:6 };
    return v === "primary"
      ? { ...base, background:`linear-gradient(135deg,${C.gold},${C.goldD})`, color:"#000", fontWeight:700, border:"none" }
      : { ...base, background:"rgba(255,255,255,0.05)", color:C.text, border:`1px solid rgba(26,53,96,0.6)` };
  };

  return (
    <nav style={{ background:"rgba(2,8,18,0.98)", backdropFilter:"blur(20px)", borderBottom:`1px solid rgba(26,53,96,0.5)`, position:"sticky", top:0, zIndex:100 }}>
      <div style={{ maxWidth:1160, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:64, padding:"0 24px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, background:`linear-gradient(135deg,${C.gold},${C.goldD})`, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:15, color:"#000", boxShadow:`0 0 14px rgba(245,158,11,0.3)` }}>₿</div>
          <span style={{ fontWeight:900, fontSize:18, background:`linear-gradient(135deg,${C.gold},#fbbf24)`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>CryptoP2P</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {user && <button onClick={() => navigate("dashboard")} style={btnSm("secondary")}>📦 Mes commandes</button>}
          {user?.isSeller && <button onClick={() => navigate("seller")} style={btnSm("secondary")}>🏪 Espace vendeur</button>}
          <div style={{ width:34, height:34, borderRadius:"50%", background:`linear-gradient(135deg,${C.gold},${C.goldD})`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:"#000", fontSize:13, overflow:"hidden", border:`2px solid rgba(245,158,11,0.3)` }}>
            {user?.avatar ? <img src={user.avatar} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : (user?.name?.[0] || "U")}
          </div>
          <button onClick={onLogout} style={btnSm("secondary")}>← Nexora</button>
        </div>
      </div>
    </nav>
  );
}
