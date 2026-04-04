// ─── CryptoDashboardPage.tsx ──────────────────────────────────────────────────
// Dashboard Acheteur — menu hamburger, profil modifiable, photo de profil
import { useState, useRef } from "react";
import { C, getCr, fmt, makeStyles, STATUS } from "./crypto-constants";
import { SidebarLayout } from "./CryptoSharedComponents";

export default function CryptoDashboardPage({ navigate, user, onLogout, orders, setOrders, updateAccount, notify }: any) {
  const st = makeStyles();
  const [active, setActive] = useState("orders");
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    whatsapp: user?.whatsapp || "",
    currentPassword: "",
    newPassword: "",
  });
  const [pwErr, setPwErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const myOrders = orders.filter((o: any) => o.buyerId === user?.id);

  const menu = [
    { id:"orders",  label:"Mes commandes",  icon:"📦", badge:myOrders.filter((o: any) => o.status === "paid").length },
    { id:"account", label:"Mon compte",     icon:"👤", badge:0 },
    { id:"support", label:"Support",        icon:"💬", badge:0 },
  ];
  const titles: any = { orders:"Mes commandes", account:"Mon compte", support:"Support" };

  const disputeOrder = (id: string) => {
    setOrders(orders.map((o: any) => o.id === id ? { ...o, status:"disputed" } : o));
    notify("Litige ouvert.", "error");
  };

  const saveProfile = () => {
    if (profileForm.newPassword && !profileForm.currentPassword) {
      setPwErr("Saisissez votre mot de passe actuel"); return;
    }
    if (profileForm.newPassword && profileForm.currentPassword !== (user.password || "")) {
      setPwErr("Mot de passe actuel incorrect"); return;
    }
    setPwErr("");
    const patch: any = { name:profileForm.name, email:profileForm.email, whatsapp:profileForm.whatsapp };
    if (profileForm.newPassword) patch.password = profileForm.newPassword;
    updateAccount(user.id, patch);
    notify("Profil mis à jour ! ✅");
  };

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateAccount(user.id, { avatar: reader.result as string });
    reader.readAsDataURL(file);
    notify("Photo de profil mise à jour ! ✅");
  };

  return (
    <SidebarLayout user={user} onLogout={onLogout} navigate={navigate} active={active} setActive={setActive} menu={menu} title={titles[active] || "Tableau de bord"}>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:28 }}>
        {[
          { l:"Total",      v:myOrders.length,                                              i:"📦", col:C.blue  },
          { l:"En attente", v:myOrders.filter((o: any) => o.status === "paid").length,      i:"⏳", col:C.gold  },
          { l:"Confirmées", v:myOrders.filter((o: any) => o.status === "confirmed").length, i:"✅", col:C.green },
        ].map(stat => (
          <div key={stat.l} style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:16, padding:18 }}>
            <div style={{ fontSize:22, marginBottom:6 }}>{stat.i}</div>
            <div style={{ fontSize:26, fontWeight:900, color:stat.col }}>{stat.v}</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{stat.l}</div>
          </div>
        ))}
      </div>

      {/* ── COMMANDES ── */}
      {active === "orders" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
            <h2 style={{ fontSize:16, fontWeight:800, color:C.text }}>Historique des commandes</h2>
            <button onClick={() => navigate("marketplace")} style={st.btn("primary","sm")}>+ Nouvel achat</button>
          </div>
          {myOrders.length === 0
            ? (
              <div style={{ textAlign:"center", padding:"60px 0", color:C.muted }}>
                <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
                <p style={{ marginBottom:16 }}>Aucune commande pour l'instant</p>
                <button onClick={() => navigate("marketplace")} style={st.btn("primary")}>Découvrir les offres →</button>
              </div>
            )
            : myOrders.map((order: any) => {
                const cr2    = getCr(order.crypto);
                const status = STATUS[order.status] || STATUS.paid;
                return (
                  <div key={order.id} style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:16, padding:18, marginBottom:12 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
                      <div style={{ flex:"1 1 180px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5, flexWrap:"wrap" }}>
                          <span style={{ fontWeight:700, color:C.gold, fontSize:13 }}>{order.id}</span>
                          <span style={{ background:status.bg, color:status.color, padding:"2px 9px", borderRadius:100, fontSize:11, fontWeight:700 }}>{status.label}</span>
                        </div>
                        <div style={{ fontSize:12, color:C.muted }}>
                          {new Date(order.createdAt).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })}
                        </div>
                      </div>
                      <div style={{ flex:"1 1 140px", display:"flex", alignItems:"center", gap:7 }}>
                        <span style={{ color:cr2.color, fontSize:18 }}>{cr2.icon}</span>
                        <div>
                          <div style={{ fontWeight:700, fontSize:14, color:C.text }}>{order.amount} {cr2.symbol}</div>
                          <div style={{ fontSize:12, color:C.muted }}>{fmt(order.totalFCFA || order.amountFCFA)} FCFA</div>
                        </div>
                      </div>
                      <div style={{ flex:"1 1 140px", fontSize:12.5, color:C.muted }}>
                        <div>Vendeur : <strong style={{ color:C.text }}>{order.seller}</strong></div>
                      </div>
                      <div style={{ display:"flex", gap:7, alignItems:"center", flexWrap:"wrap" }}>
                        {order.status === "paid"      && <span style={{ fontSize:12, color:C.gold, fontStyle:"italic" }}>⏳ Attente vendeur…</span>}
                        {order.status === "confirmed" && <span style={{ color:C.green, fontSize:12, fontWeight:600 }}>✅ Terminé</span>}
                        {order.status === "disputed"  && <span style={{ color:C.red, fontSize:12, fontWeight:600 }}>⚠️ Litige</span>}
                        {order.status === "paid"      && <button onClick={() => disputeOrder(order.id)} style={st.btn("red","sm")}>⚠️ Litige</button>}
                      </div>
                    </div>
                  </div>
                );
              })
          }
        </div>
      )}

      {/* ── MON COMPTE ── */}
      {active === "account" && (
        <div>
          {/* Photo de profil */}
          <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:16, padding:22, marginBottom:20 }}>
            <h3 style={{ fontSize:16, fontWeight:700, marginBottom:18, color:C.text }}>📸 Photo de profil</h3>
            <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
              <div style={{ width:72, height:72, borderRadius:"50%", background:`linear-gradient(135deg,${C.gold},${C.goldD})`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:28, color:"#000", overflow:"hidden", flexShrink:0, border:`3px solid ${C.gold}` }}>
                {user?.avatar
                  ? <img src={user.avatar} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  : user?.name?.[0]}
              </div>
              <div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleAvatar} />
                <button onClick={() => fileRef.current?.click()} style={st.btn("secondary","sm")}>📷 Changer la photo</button>
                <p style={{ fontSize:12, color:C.muted, marginTop:6 }}>JPG, PNG ou GIF — max 2 Mo</p>
              </div>
            </div>
          </div>

          {/* Infos */}
          <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:16, padding:22, marginBottom:20 }}>
            <h3 style={{ fontSize:16, fontWeight:700, marginBottom:18, color:C.text }}>✏️ Modifier mes informations</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={st.label}>Nom complet</label>
                <input style={st.input} value={profileForm.name}
                  onChange={e => setProfileForm({...profileForm, name:e.target.value})} />
              </div>
              <div>
                <label style={st.label}>Email</label>
                <input style={st.input} type="email" value={profileForm.email}
                  onChange={e => setProfileForm({...profileForm, email:e.target.value})} />
              </div>
              <div>
                <label style={st.label}>Numéro WhatsApp</label>
                <input style={st.input} placeholder="+229 01 XX XX XX" value={profileForm.whatsapp}
                  onChange={e => setProfileForm({...profileForm, whatsapp:e.target.value})} />
              </div>
            </div>
          </div>

          {/* Mot de passe */}
          <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:16, padding:22, marginBottom:20 }}>
            <h3 style={{ fontSize:16, fontWeight:700, marginBottom:18, color:C.text }}>🔑 Changer le mot de passe</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={st.label}>Mot de passe actuel</label>
                <input style={st.input} type="password" placeholder="••••••••" value={profileForm.currentPassword}
                  onChange={e => { setProfileForm({...profileForm, currentPassword:e.target.value}); setPwErr(""); }} />
              </div>
              <div>
                <label style={st.label}>Nouveau mot de passe</label>
                <input style={st.input} type="password" placeholder="Nouveau mot de passe" value={profileForm.newPassword}
                  onChange={e => { setProfileForm({...profileForm, newPassword:e.target.value}); setPwErr(""); }} />
              </div>
              {pwErr && <p style={{ color:C.red, fontSize:13 }}>⚠️ {pwErr}</p>}
            </div>
          </div>

          <button onClick={saveProfile} style={{ ...st.btn("primary"), width:"100%", justifyContent:"center", fontSize:15 }}>
            💾 Sauvegarder les modifications
          </button>
        </div>
      )}

      {/* ── SUPPORT ── */}
      {active === "support" && (
        <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:16, padding:22 }}>
          <h3 style={{ fontSize:17, fontWeight:700, marginBottom:16, color:C.text }}>Contacter le support</h3>
          <p style={{ color:C.muted, fontSize:14, marginBottom:22, lineHeight:1.6 }}>Disponible 7j/7 pour résoudre vos problèmes.</p>
          <a href="https://wa.me/22901555237685" target="_blank" rel="noreferrer"
            style={{ ...st.btn("green"), textDecoration:"none", justifyContent:"center", fontSize:15, display:"flex" }}>
            📱 Contacter sur WhatsApp
          </a>
        </div>
      )}

    </SidebarLayout>
  );
}
