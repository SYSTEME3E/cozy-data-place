// ─── CryptoSellerPage.tsx ─────────────────────────────────────────────────────
// Espace Vendeur — wallet copiable, frais réseau, pays autorisés, crypto custom,
// finance verrouillée, compte modifiable avec photo de profil
import { useState, useRef } from "react";
import { C, CRYPTOS, getCr, fmt, makeStyles, STATUS } from "./crypto-constants";
import { SidebarLayout } from "./CryptoSharedComponents";

const PAYS_LISTE = [
  "Bénin","Togo","Niger","Mali","Burkina Faso","Côte d'Ivoire","Sénégal","Cameroun",
  "Ghana","Nigeria","Congo","Gabon","Guinée","Madagascar","Rwanda","Kenya","Maroc",
  "Tunisie","Algérie","Égypte","France","Belgique","Suisse","Canada","USA","Autre",
];

export default function CryptoSellerPage({ navigate, user, onLogout, offers, setOffers, orders, setOrders, updateAccount, accounts, notify }: any) {
  const st = makeStyles();
  const [active, setActive] = useState("orders");
  const [showForm, setShowForm] = useState(false);
  const [offerForm, setOfferForm] = useState({
    crypto: "usdt_trc20",
    customCrypto: "",
    rate: "",
    minAmount: "",
    maxAmount: "",
    available: "",
    networkFee: "",
    walletAddress: user?.walletAddresses?.usdt_trc20 || "",
    allowedCountries: (user?.allowedCountries || []) as string[],
  });
  const [payForm, setPayForm] = useState({
    reseau: user?.paymentInfo?.reseau || "",
    numero: user?.paymentInfo?.numero || "",
    lienPaiement: user?.paymentInfo?.lienPaiement || "",
  });
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    whatsapp: user?.whatsapp || "",
    newPassword: "",
    currentPassword: "",
  });
  const [pwErr, setPwErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const myOffers = offers.filter((o: any) => o.sellerId === user?.id);
  const myOrders = orders.filter((o: any) => o.sellerId === user?.id);
  const limits   = user?.sellerLimits || { reserve:0, maxSell:0, minSell:0 };
  const earnings = myOrders.filter((o: any) => o.status === "confirmed").reduce((s: number, o: any) => s + o.amountFCFA, 0);
  const pending  = myOrders.filter((o: any) => o.status === "paid").reduce((s: number, o: any) => s + o.totalFCFA, 0);

  // Statut vendeur bloqué / restreint
  const isBlocked    = user?.sellerStatus === "blocked";
  const isRestricted = user?.sellerStatus === "restricted";
  const canPostAnnounce = user?.canPostAnnounce !== false;

  const menu = [
    { id:"orders",  label:"Commandes reçues",  icon:"📦", badge:myOrders.filter((o: any) => o.status === "paid").length },
    { id:"offers",  label:"Mes annonces",       icon:"🏷️", badge:0 },
    { id:"wallet",  label:"Wallet & Paiement",  icon:"💳", badge:(!user?.paymentInfo?.numero && !user?.paymentInfo?.lienPaiement) ? 1 : 0 },
    { id:"finance", label:"Finance",            icon:"💰", badge:0 },
    { id:"account", label:"Mon compte",         icon:"👤", badge:0 },
  ];
  const titles: any = { orders:"Commandes reçues", offers:"Mes annonces", wallet:"Wallet & Paiement", finance:"Finance", account:"Mon compte" };

  const confirmOrder = (id: string) => {
    setOrders(orders.map((o: any) => o.id === id ? { ...o, status:"confirmed" } : o));
    notify("Commande confirmée ! Crypto envoyée. ✅");
  };
  const disputeOrder = (id: string) => {
    setOrders(orders.map((o: any) => o.id === id ? { ...o, status:"disputed" } : o));
    notify("Litige ouvert.", "error");
  };

  const toggleCountry = (country: string) => {
    const cur = offerForm.allowedCountries;
    setOfferForm({
      ...offerForm,
      allowedCountries: cur.includes(country) ? cur.filter((c: string) => c !== country) : [...cur, country],
    });
  };

  const createOffer = () => {
    const cryptoId = offerForm.crypto === "__custom__"
      ? offerForm.customCrypto.trim().toLowerCase().replace(/\s+/g,"_")
      : offerForm.crypto;
    if (!offerForm.rate || !offerForm.minAmount || !offerForm.maxAmount || !offerForm.available) {
      notify("Remplissez tous les champs obligatoires", "error"); return;
    }
    if (offerForm.crypto === "__custom__" && !offerForm.customCrypto.trim()) {
      notify("Saisissez le nom de la crypto", "error"); return;
    }
    if (!user?.paymentInfo?.numero && !user?.paymentInfo?.lienPaiement) {
      notify("Configurez d'abord vos infos de paiement (onglet 💳)", "error");
      setActive("wallet"); return;
    }
    const minA = parseFloat(offerForm.minAmount);
    const maxA = parseFloat(offerForm.maxAmount);
    if (limits.minSell > 0 && minA < limits.minSell) {
      notify(`Minimum autorisé par l'admin : ${limits.minSell}`, "error"); return;
    }
    if (limits.maxSell > 0 && maxA > limits.maxSell) {
      notify(`Maximum autorisé par l'admin : ${limits.maxSell}`, "error"); return;
    }
    if (offerForm.allowedCountries.length === 0) {
      notify("Sélectionnez au moins un pays de vente", "error"); return;
    }
    setOffers((p: any) => [{
      id: `off_${Date.now()}`,
      sellerId: user.id,
      sellerName: user.name,
      sellerAvatar: user.avatar || user.name[0],
      crypto: cryptoId,
      customCryptoName: offerForm.crypto === "__custom__" ? offerForm.customCrypto.trim() : undefined,
      rate: parseFloat(offerForm.rate),
      minAmount: minA,
      maxAmount: maxA,
      available: parseFloat(offerForm.available),
      networkFee: parseFloat(offerForm.networkFee) || 0,
      walletAddress: offerForm.walletAddress,
      paymentMethods: [user.paymentInfo?.reseau || "Mobile Money"],
      allowedCountries: offerForm.allowedCountries,
      createdAt: new Date().toISOString(),
    }, ...p]);
    setOfferForm({ crypto:"usdt_trc20", customCrypto:"", rate:"", minAmount:"", maxAmount:"", available:"", networkFee:"", walletAddress:"", allowedCountries:[] });
    setShowForm(false);
    notify("Annonce publiée ! ✅");
  };

  const savePayment = () => {
    if (!payForm.reseau) { notify("Entrez le réseau de paiement", "error"); return; }
    if (!payForm.numero && !payForm.lienPaiement) { notify("Entrez un numéro ou un lien", "error"); return; }
    updateAccount(user.id, { paymentInfo: { reseau:payForm.reseau, numero:payForm.numero, lienPaiement:payForm.lienPaiement } });
    notify("Infos de paiement sauvegardées ! ✅");
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
    <SidebarLayout user={user} onLogout={onLogout} navigate={navigate} active={active} setActive={setActive} menu={menu} title={titles[active] || "Espace Vendeur"}>

      {/* Bannière statut bloqué/restreint */}
      {isBlocked && (
        <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.4)", borderRadius:12, padding:"14px 18px", marginBottom:20, color:C.red, fontWeight:700, fontSize:14 }}>
          🚫 Votre compte vendeur est bloqué. Contactez l'administrateur.
        </div>
      )}
      {isRestricted && (
        <div style={{ background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.3)", borderRadius:12, padding:"14px 18px", marginBottom:20, color:C.gold, fontWeight:700, fontSize:14 }}>
          ⚠️ Votre compte vendeur est restreint. Certaines fonctionnalités sont limitées.
        </div>
      )}
      {!canPostAnnounce && !isBlocked && (
        <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.35)", borderRadius:12, padding:"14px 18px", marginBottom:20, color:"#ef4444", fontWeight:700, fontSize:14 }}>
          📢 L'accès aux annonces a été désactivé par l'administrateur. Vos commandes en cours restent actives.
        </div>
      )}

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))", gap:12, marginBottom:28 }}>
        {[
          { l:"Revenus confirmés", v:`${fmt(earnings)} FCFA`, i:"💰", col:C.green  },
          { l:"En attente",        v:`${fmt(pending)} FCFA`,  i:"⏳", col:C.gold   },
          { l:"Commandes",         v:myOrders.length,         i:"📦", col:C.blue   },
          { l:"Annonces actives",  v:myOffers.length,         i:"🏷️", col:C.purple },
        ].map(stat => (
          <div key={stat.l} style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:16, padding:18 }}>
            <div style={{ fontSize:22, marginBottom:6 }}>{stat.i}</div>
            <div style={{ fontSize:typeof stat.v === "number" ? 26 : 14, fontWeight:900, color:stat.col, lineHeight:1.2 }}>{stat.v}</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>{stat.l}</div>
          </div>
        ))}
      </div>

      {/* Limites admin */}
      {limits.maxSell > 0 && (
        <div style={{ background:"rgba(6,182,212,0.07)", border:"1px solid rgba(6,182,212,0.2)", borderRadius:12, padding:"12px 16px", marginBottom:20, display:"flex", gap:20, flexWrap:"wrap", fontSize:13 }}>
          <span style={{ color:C.muted }}>Limites définies par l'admin :</span>
          <span style={{ color:C.cyan }}>Min : <strong>${limits.minSell}</strong></span>
          <span style={{ color:C.cyan }}>Max : <strong>${limits.maxSell}</strong></span>
          <span style={{ color:C.gold }}>Réserve bloquée : <strong>${limits.reserve}</strong></span>
        </div>
      )}

      {/* ── COMMANDES ── */}
      {active === "orders" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {myOrders.length === 0
            ? <div style={{ textAlign:"center", padding:"60px 0", color:C.muted }}><div style={{ fontSize:48, marginBottom:12 }}>📭</div><p>Aucune commande reçue</p></div>
            : myOrders.map((order: any) => {
                const cr2   = getCr(order.crypto);
                const status = STATUS[order.status] || STATUS.paid;
                return (
                  <div key={order.id} style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:16, padding:18 }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:14, flexWrap:"wrap" }}>
                      <div style={{ flex:"1 1 180px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5, flexWrap:"wrap" }}>
                          <span style={{ fontWeight:700, color:C.gold, fontSize:13 }}>{order.id}</span>
                          <span style={{ background:status.bg, color:status.color, padding:"2px 9px", borderRadius:100, fontSize:11, fontWeight:700 }}>{status.label}</span>
                        </div>
                        <div style={{ fontSize:12, color:C.muted }}>Acheteur : <strong style={{ color:C.text }}>{order.buyerName}</strong></div>
                        {order.buyerWhatsapp && (
                          <a href={`https://wa.me/${order.buyerWhatsapp.replace(/\s/g,"")}`} target="_blank" rel="noreferrer"
                            style={{ fontSize:12, color:C.green, textDecoration:"none" }}>
                            📱 {order.buyerWhatsapp}
                          </a>
                        )}
                        {order.buyerCountry && <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>🌍 {order.buyerCountry}</div>}
                        {/* Adresse wallet de l'acheteur */}
                        {order.walletAddr && (
                          <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                            <span style={{ fontSize:11, color:C.muted }}>Wallet :</span>
                            <span style={{ fontSize:11, color:C.text, fontFamily:"monospace", wordBreak:"break-all" }}>{order.walletAddr}</span>
                            <button onClick={() => { navigator.clipboard?.writeText(order.walletAddr); notify("Adresse copiée ! 📋"); }}
                              style={{ ...st.btn("secondary","sm"), padding:"3px 8px", fontSize:11 }}>📋 Copier</button>
                          </div>
                        )}
                      </div>
                      <div style={{ flex:"1 1 140px", display:"flex", alignItems:"center", gap:7 }}>
                        <span style={{ color:cr2.color, fontSize:18 }}>{cr2.icon}</span>
                        <div>
                          <div style={{ fontWeight:700, fontSize:14, color:C.text }}>{order.amount} {cr2.symbol}</div>
                          <div style={{ fontSize:12, color:C.muted }}>{fmt(order.totalFCFA || order.amountFCFA)} FCFA</div>
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:7, alignItems:"center", flexWrap:"wrap" }}>
                        {order.status === "paid" && <button onClick={() => confirmOrder(order.id)} style={st.btn("green","sm")}>✅ Confirmer</button>}
                        {order.status === "paid" && <button onClick={() => disputeOrder(order.id)} style={st.btn("red","sm")}>⚠️ Litige</button>}
                        {order.status === "confirmed" && <span style={{ color:C.green, fontSize:12, fontWeight:600 }}>✅ Terminé</span>}
                      </div>
                    </div>
                    {order.paymentMessage && (
                      <div style={{ marginTop:12, padding:"10px 14px", background:"rgba(255,255,255,0.03)", borderRadius:10, fontSize:12.5, color:C.muted, borderLeft:`3px solid ${C.blue}` }}>
                        <strong style={{ color:C.text }}>Message acheteur : </strong>{order.paymentMessage}
                      </div>
                    )}
                  </div>
                );
              })
          }
        </div>
      )}

      {/* ── ANNONCES ── */}
      {active === "offers" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
            <h2 style={{ fontSize:16, fontWeight:800, color:C.text }}>Mes annonces publiées</h2>
            {!isBlocked && <button onClick={() => setShowForm(!showForm)} style={st.btn("primary","sm")}>+ Nouvelle annonce</button>}
          </div>

          {showForm && (
            <div style={{ background:C.bgCard, border:"1px solid rgba(245,158,11,0.3)", borderRadius:16, padding:22, marginBottom:20 }}>
              <h3 style={{ fontSize:15, fontWeight:700, marginBottom:18, color:C.text }}>Publier une annonce</h3>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

                {/* Crypto — avec option personnalisée */}
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={st.label}>Crypto-monnaie à vendre *</label>
                  <select style={st.input} value={offerForm.crypto} onChange={e => setOfferForm({...offerForm, crypto:e.target.value})}>
                    {CRYPTOS.map(cr2 => <option key={cr2.id} value={cr2.id}>{cr2.name} ({cr2.network})</option>)}
                    <option value="__custom__">✏️ Autre (saisir manuellement)</option>
                  </select>
                </div>
                {offerForm.crypto === "__custom__" && (
                  <div style={{ gridColumn:"1/-1" }}>
                    <label style={st.label}>Nom de la crypto / réseau *</label>
                    <input style={st.input} placeholder="Ex: USDT ERC20, SOL, XRP…" value={offerForm.customCrypto}
                      onChange={e => setOfferForm({...offerForm, customCrypto:e.target.value})} />
                  </div>
                )}

                {/* Taux en FCFA */}
                <div>
                  <label style={st.label}>Taux (FCFA / 1 unité) *</label>
                  <input style={st.input} type="number" placeholder="Ex: 640" value={offerForm.rate}
                    onChange={e => setOfferForm({...offerForm, rate:e.target.value})} />
                </div>
                <div>
                  <label style={st.label}>Quantité disponible *</label>
                  <input style={st.input} type="number" placeholder="0" value={offerForm.available}
                    onChange={e => setOfferForm({...offerForm, available:e.target.value})} />
                </div>
                <div>
                  <label style={st.label}>Montant minimum *{limits.minSell > 0 ? ` (admin: ≥$${limits.minSell})` : ""}</label>
                  <input style={st.input} type="number" placeholder="0" value={offerForm.minAmount}
                    onChange={e => setOfferForm({...offerForm, minAmount:e.target.value})} />
                </div>
                <div>
                  <label style={st.label}>Montant maximum *{limits.maxSell > 0 ? ` (admin: ≤$${limits.maxSell})` : ""}</label>
                  <input style={st.input} type="number" placeholder="0" value={offerForm.maxAmount}
                    onChange={e => setOfferForm({...offerForm, maxAmount:e.target.value})} />
                </div>

                {/* Frais de réseau (payés par l'acheteur) */}
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={st.label}>Frais de réseau (FCFA) — payés par l'acheteur</label>
                  <input style={st.input} type="number" placeholder="Ex: 500" value={offerForm.networkFee}
                    onChange={e => setOfferForm({...offerForm, networkFee:e.target.value})} />
                  <p style={{ fontSize:11, color:C.muted, marginTop:4 }}>Ces frais seront ajoutés au total que l'acheteur paiera.</p>
                </div>

                {/* Adresse wallet */}
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={st.label}>Votre adresse wallet de réception *</label>
                  <div style={{ position:"relative" }}>
                    <input style={{ ...st.input, paddingRight:100 }} placeholder="Adresse sur laquelle vous recevrez les cryptos" value={offerForm.walletAddress}
                      onChange={e => setOfferForm({...offerForm, walletAddress:e.target.value})} />
                    {offerForm.walletAddress && (
                      <button onClick={() => { navigator.clipboard?.writeText(offerForm.walletAddress); notify("Adresse copiée ! 📋"); }}
                        style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", ...st.btn("secondary","sm"), padding:"4px 10px", fontSize:11 }}>
                        📋 Copier
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize:11, color:C.muted, marginTop:4 }}>Cette adresse sera affichée à l'acheteur pour qu'il vous envoie la crypto.</p>
                </div>

                {/* Pays autorisés */}
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={st.label}>Pays de vente autorisés * <span style={{ color:C.muted, fontWeight:400 }}>(sélectionnez les pays)</span></label>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:7, maxHeight:160, overflowY:"auto", background:"rgba(255,255,255,0.03)", borderRadius:10, padding:10, border:`1px solid ${C.border}` }}>
                    {PAYS_LISTE.map(p => {
                      const sel = offerForm.allowedCountries.includes(p);
                      return (
                        <button key={p} onClick={() => toggleCountry(p)}
                          style={{ background:sel?"rgba(245,158,11,0.2)":"rgba(255,255,255,0.04)", border:`1px solid ${sel?C.gold:C.border}`, color:sel?C.gold:C.muted, borderRadius:8, padding:"5px 10px", fontSize:12, cursor:"pointer", fontWeight:sel?700:400 }}>
                          {sel ? "✓ " : ""}{p}
                        </button>
                      );
                    })}
                  </div>
                  {offerForm.allowedCountries.length > 0 && (
                    <p style={{ fontSize:12, color:C.gold, marginTop:5 }}>
                      ✓ {offerForm.allowedCountries.length} pays sélectionné{offerForm.allowedCountries.length > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ marginTop:16, display:"flex", gap:8 }}>
                <button onClick={createOffer} style={st.btn("primary","sm")}>Publier ✅</button>
                <button onClick={() => setShowForm(false)} style={st.btn("secondary","sm")}>Annuler</button>
              </div>
            </div>
          )}

          {myOffers.length === 0
            ? <div style={{ textAlign:"center", padding:"60px 0", color:C.muted }}><div style={{ fontSize:48, marginBottom:12 }}>📋</div><p>Aucune annonce publiée</p></div>
            : myOffers.map((offer: any) => {
                const cr2 = getCr(offer.crypto);
                const name = offer.customCryptoName || cr2.name;
                return (
                  <div key={offer.id} style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:16, padding:18, marginBottom:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
                      <div style={{ flex:"1 1 150px", display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ color:cr2.color, fontSize:22 }}>{cr2.icon}</span>
                        <div>
                          <div style={{ fontWeight:700, fontSize:14, color:C.text }}>{name}</div>
                          <div style={{ fontSize:11, color:C.muted }}>{cr2.network}</div>
                        </div>
                      </div>
                      <div style={{ flex:"1 1 130px" }}>
                        {/* Taux en FCFA côté vendeur */}
                        <div style={{ fontWeight:800, fontSize:17, color:C.gold }}>{fmt(offer.rate)} FCFA</div>
                        <div style={{ fontSize:12, color:C.muted }}>Dispo : {fmt(offer.available)}</div>
                        {offer.networkFee > 0 && <div style={{ fontSize:12, color:C.gold }}>+{fmt(offer.networkFee)} FCFA frais</div>}
                      </div>
                      {/* Wallet copiable */}
                      {offer.walletAddress && (
                        <div style={{ flex:"1 1 180px", fontSize:11, color:C.muted }}>
                          <div style={{ marginBottom:4 }}>Wallet de réception :</div>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <span style={{ fontFamily:"monospace", fontSize:11, color:C.text, wordBreak:"break-all" }}>
                              {offer.walletAddress.slice(0,12)}…{offer.walletAddress.slice(-6)}
                            </span>
                            <button onClick={() => { navigator.clipboard?.writeText(offer.walletAddress); notify("Adresse copiée ! 📋"); }}
                              style={{ ...st.btn("secondary","sm"), padding:"3px 8px", fontSize:11, flexShrink:0 }}>📋</button>
                          </div>
                        </div>
                      )}
                      {offer.allowedCountries?.length > 0 && (
                        <div style={{ flex:"1 1 140px", fontSize:11, color:C.muted }}>🌍 {offer.allowedCountries.join(", ")}</div>
                      )}
                      <div style={{ display:"flex", gap:8 }}>
                        <span style={{ background:"rgba(16,185,129,0.12)", color:C.green, padding:"4px 12px", borderRadius:100, fontSize:12, fontWeight:700 }}>● Active</span>
                        <button onClick={() => setOffers(offers.filter((o: any) => o.id !== offer.id))} style={st.btn("danger","sm")}>🗑</button>
                      </div>
                    </div>
                  </div>
                );
              })
          }
        </div>
      )}

      {/* ── WALLET & PAIEMENT ── */}
      {active === "wallet" && (
        <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:16, padding:22 }}>
          <h3 style={{ fontSize:17, fontWeight:700, marginBottom:8, color:C.text }}>💳 Infos de paiement Mobile Money</h3>
          <p style={{ color:C.muted, fontSize:13, marginBottom:24, lineHeight:1.6 }}>Ces infos seront affichées aux acheteurs pour qu'ils vous paient.</p>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <label style={st.label}>Réseau Mobile Money *</label>
              <input style={st.input} placeholder="Ex: MTN MoMo, Orange Money…" value={payForm.reseau}
                onChange={e => setPayForm({...payForm, reseau:e.target.value})} />
            </div>
            <div>
              <label style={st.label}>Numéro Mobile Money</label>
              <div style={{ position:"relative" }}>
                <input style={{ ...st.input, paddingRight:100 }} placeholder="Ex: +229 01 55 23 76 85" value={payForm.numero}
                  onChange={e => setPayForm({...payForm, numero:e.target.value})} />
                {payForm.numero && (
                  <button onClick={() => { navigator.clipboard?.writeText(payForm.numero); notify("Numéro copié ! 📋"); }}
                    style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", ...st.btn("secondary","sm"), padding:"4px 10px", fontSize:11 }}>📋 Copier</button>
                )}
              </div>
            </div>
            <div>
              <label style={st.label}>Lien de paiement — optionnel</label>
              <input style={st.input} placeholder="https://..." value={payForm.lienPaiement}
                onChange={e => setPayForm({...payForm, lienPaiement:e.target.value})} />
            </div>
          </div>
          <button onClick={savePayment} style={{ ...st.btn("primary"), marginTop:22, width:"100%", justifyContent:"center" }}>
            💾 Sauvegarder
          </button>
        </div>
      )}

      {/* ── FINANCE — BLOQUÉE ── */}
      {active === "finance" && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:300 }}>
          <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:20, padding:40, textAlign:"center", maxWidth:420 }}>
            <div style={{ fontSize:56, marginBottom:16 }}>🔒</div>
            <h3 style={{ fontSize:20, fontWeight:800, color:C.red, marginBottom:12 }}>Accès restreint</h3>
            <p style={{ color:C.muted, fontSize:14, lineHeight:1.7 }}>
              Vous n'avez pas accès à cette fonctionnalité.<br/>
              Contactez l'administrateur pour plus d'informations.
            </p>
          </div>
        </div>
      )}

      {/* ── COMPTE ── */}
      {active === "account" && (
        <div>
          {/* Photo de profil */}
          <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:16, padding:22, marginBottom:20 }}>
            <h3 style={{ fontSize:16, fontWeight:700, marginBottom:18, color:C.text }}>📸 Photo de profil</h3>
            <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
              <div style={{ width:72, height:72, borderRadius:"50%", background:`linear-gradient(135deg,${C.gold},${C.goldD})`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:28, color:"#000", overflow:"hidden", flexShrink:0, border:`3px solid ${C.gold}` }}>
                {user?.avatar ? <img src={user.avatar} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : user?.name?.[0]}
              </div>
              <div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleAvatar} />
                <button onClick={() => fileRef.current?.click()} style={st.btn("secondary","sm")}>📷 Changer la photo</button>
                <p style={{ fontSize:12, color:C.muted, marginTop:6 }}>JPG, PNG ou GIF — max 2 Mo</p>
              </div>
            </div>
          </div>

          {/* Infos personnelles */}
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

          {/* Changer mot de passe */}
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

    </SidebarLayout>
  );
}
