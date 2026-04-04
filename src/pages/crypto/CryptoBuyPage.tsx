// ─── CryptoBuyPage.tsx ───────────────────────────────────────────────────────
// Achat crypto — WhatsApp obligatoire, vérification pays, frais réseau payés par acheteur
import { useState } from "react";
import { C, getCr, fmt, makeStyles, CRYPTOS } from "./crypto-constants";

const PAYS_LISTE = [
  "Bénin","Togo","Niger","Mali","Burkina Faso","Côte d'Ivoire","Sénégal","Cameroun",
  "Ghana","Nigeria","Congo","Gabon","Guinée","Madagascar","Rwanda","Kenya","Maroc",
  "Tunisie","Algérie","Égypte","France","Belgique","Suisse","Canada","USA","Autre",
];

export default function CryptoBuyPage({ navigate, user, offer, orders, setOrders, accounts, notify }: any) {
  const st = makeStyles();
  const [step, setStep]       = useState(1);
  const [wallet, setWallet]   = useState("");
  const [amount, setAmount]   = useState("");
  const [wapp, setWapp]       = useState(user?.whatsapp || "");
  const [country, setCountry] = useState(user?.country || "");
  const [wErr, setWErr]       = useState("");
  const [countryErr, setCountryErr] = useState("");
  const [payMsg, setPayMsg]   = useState("");
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState("");

  if (!offer) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
        <p style={{ marginBottom:20, color:C.muted }}>Aucune offre sélectionnée</p>
        <button onClick={() => navigate("marketplace")} style={st.btn("primary")}>← Retour</button>
      </div>
    </div>
  );

  const sellerAcc = accounts.find((a: any) => a.id === offer.sellerId) || {};
  const pi  = sellerAcc.paymentInfo || {};
  const cr  = getCr(offer.crypto);
  const cryptoName = offer.customCryptoName || cr.name;

  const baseAmount = amount ? Math.round(parseFloat(amount) * offer.rate) : 0;
  const networkFee = offer.networkFee || 0;
  const totalFCFA  = baseAmount + networkFee;

  // Validation adresse wallet (seulement pour cryptos connues avec regex)
  const knownCrypto = CRYPTOS.find(c => c.id === offer.crypto);
  const vw = (addr: string) => {
    if (!addr) { setWErr(""); return; }
    if (knownCrypto) {
      setWErr(knownCrypto.addrRegex.test(addr) ? "" : ` Format invalide. Ex : ${knownCrypto.addrEx}`);
    } else {
      setWErr(""); // Crypto personnalisée — pas de validation regex
    }
  };

  const handleStep1 = () => {
    // Vérification pays
    if (!country) { notify("Sélectionnez votre pays", "error"); return; }
    // Vérifier si le pays est autorisé par le vendeur
    if (offer.allowedCountries && offer.allowedCountries.length > 0 && !offer.allowedCountries.includes(country)) {
      setCountryErr(`Le vendeur ne vend pas dans votre pays (${country}). Pays acceptés : ${offer.allowedCountries.join(", ")}.`);
      notify(`Désolé, ce vendeur ne vend pas en ${country}.`, "error");
      return;
    }
    setCountryErr("");
    if (!wapp || wapp.length < 8) { notify("Numéro WhatsApp obligatoire", "error"); return; }
    if (!wallet) { notify("Entrez votre adresse wallet", "error"); return; }
    if (wErr) { notify("Adresse wallet invalide", "error"); return; }
    if (!amount || parseFloat(amount) <= 0) { notify("Montant invalide", "error"); return; }
    if (parseFloat(amount) < offer.minAmount) { notify(`Min : ${offer.minAmount} ${cr.symbol}`, "error"); return; }
    if (parseFloat(amount) > offer.maxAmount) { notify(`Max : ${offer.maxAmount} ${cr.symbol}`, "error"); return; }
    setStep(2);
  };

  const handleConfirm = () => {
    if (!payMsg.trim()) { notify("Décrivez votre paiement", "error"); return; }
    setLoading(true);
    setTimeout(() => {
      const id = `CMD-${Date.now().toString().slice(-6)}`;
      setOrderId(id);
      setOrders((p: any) => [{
        id,
        crypto: offer.crypto,
        amount: parseFloat(amount),
        amountFCFA: baseAmount,
        networkFee,
        totalFCFA,
        walletAddr: wallet,
        seller: offer.sellerName,
        sellerId: offer.sellerId,
        buyerId: user.id,
        buyerName: user.name,
        buyerWhatsapp: wapp,
        buyerCountry: country,
        paymentMessage: payMsg,
        status: "paid",
        createdAt: new Date().toISOString(),
      }, ...p]);
      setStep(3);
      setLoading(false);
      notify("Déclaration de paiement envoyée !");
    }, 1200);
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg }}>
      <nav style={{ background:"rgba(6,9,15,0.97)", backdropFilter:"blur(20px)", borderBottom:`1px solid ${C.border}`, padding:"0 24px" }}>
        <div style={{ maxWidth:1160, margin:"0 auto", display:"flex", alignItems:"center", height:62, gap:14 }}>
          <button onClick={() => navigate("marketplace")} style={st.btn("secondary","sm")}>← Retour</button>
          <span style={{ fontWeight:700, fontSize:15, color:C.text }}>Acheter {cryptoName}</span>
        </div>
      </nav>

      <div style={{ maxWidth:560, margin:"36px auto", padding:"0 24px" }}>
        {/* Progress */}
        <div style={{ display:"flex", alignItems:"center", marginBottom:36 }}>
          {["Détails","Paiement","Terminé"].map((s2, i) => (
            <div key={s2} style={{ display:"flex", alignItems:"center", flex:1 }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1 }}>
                <div style={{ width:30, height:30, borderRadius:"50%", background:step > i+1 ? C.green : step === i+1 ? C.gold : "rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12, color:step >= i+1 ? "#000" : C.muted, marginBottom:5 }}>
                  {step > i+1 ? "✓" : i+1}
                </div>
                <span style={{ fontSize:11, color:step === i+1 ? C.gold : C.muted, whiteSpace:"nowrap" }}>{s2}</span>
              </div>
              {i < 2 && <div style={{ height:2, flex:1, background:step > i+1 ? C.green : "rgba(255,255,255,0.08)", margin:"0 6px 18px" }}/>}
            </div>
          ))}
        </div>

        {/* Seller card */}
        <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:16, marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:"50%", background:"linear-gradient(135deg,#0f2035,#1e3a5f)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:C.gold, fontSize:15, flexShrink:0, overflow:"hidden" }}>
            {sellerAcc.avatar ? <img src={sellerAcc.avatar} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : offer.sellerAvatar}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:14, color:C.text }}>{offer.sellerName}</div>
            {offer.allowedCountries?.length > 0 && (
              <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>🌍 Vend en : {offer.allowedCountries.join(", ")}</div>
            )}
          </div>
          <div style={{ textAlign:"right" }}>
            {/* Taux en FCFA côté acheteur */}
            <div style={{ fontWeight:800, color:C.gold, fontSize:16 }}>{fmt(offer.rate)}</div>
            <div style={{ fontSize:11, color:C.muted }}>FCFA / {cr.symbol}</div>
          </div>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:16, padding:22 }}>
            <h2 style={{ fontSize:18, fontWeight:800, marginBottom:22, color:C.text }}>Détails de la commande</h2>

            {/* Pays */}
            <div style={{ marginBottom:18 }}>
              <label style={{ ...st.label, color:C.text }}>🌍 Votre pays * <span style={{ color:C.red }}>obligatoire</span></label>
              <select style={{ ...st.input, borderColor:countryErr ? C.red : undefined }} value={country}
                onChange={e => { setCountry(e.target.value); setCountryErr(""); }}>
                <option value="">— Sélectionnez votre pays —</option>
                {PAYS_LISTE.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {countryErr && <p style={{ color:C.red, fontSize:12, marginTop:5 }}>🚫 {countryErr}</p>}
            </div>

            {/* WhatsApp obligatoire */}
            <div style={{ marginBottom:18 }}>
              <label style={{ ...st.label, color:C.gold }}>📱 Numéro WhatsApp * <span style={{ color:C.red }}>obligatoire</span></label>
              <input style={st.input} placeholder="+229 01 XX XX XX XX" value={wapp}
                onChange={e => setWapp(e.target.value)} />
              <p style={{ fontSize:12, color:C.muted, marginTop:5 }}>Le vendeur vous contactera sur WhatsApp pour confirmer.</p>
            </div>

            {/* Adresse wallet */}
            <div style={{ marginBottom:18 }}>
              <label style={st.label}>Votre adresse Wallet {cryptoName} *</label>
              <input
                style={{ ...st.input, borderColor:wErr ? C.red : wallet && !wErr ? C.green : undefined }}
                placeholder={knownCrypto ? knownCrypto.addrEx : "Entrez votre adresse wallet"}
                value={wallet}
                onChange={e => { setWallet(e.target.value); vw(e.target.value); }}
              />
              {wErr && <p style={{ color:C.red, fontSize:12, marginTop:5 }}>⚠️{wErr}</p>}
              {wallet && !wErr && <p style={{ color:C.green, fontSize:12, marginTop:5 }}>✅ Adresse valide</p>}
            </div>

            {/* Quantité */}
            <div style={{ marginBottom:22 }}>
              <label style={st.label}>Quantité de {cr.symbol} *</label>
              <div style={{ position:"relative" }}>
                <input style={{ ...st.input, paddingRight:72 }} type="number" placeholder={`Min: ${offer.minAmount}`} value={amount}
                  onChange={e => setAmount(e.target.value)} />
                <span style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", fontWeight:700, color:cr.color, fontSize:13 }}>{cr.symbol}</span>
              </div>
              <div style={{ fontSize:12, color:C.muted, marginTop:5 }}>Limites : {offer.minAmount} – {fmt(offer.maxAmount)} {cr.symbol}</div>
            </div>

            {/* Récapitulatif */}
            {baseAmount > 0 && (
              <div style={{ background:"rgba(245,158,11,0.07)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:12, padding:16, marginBottom:22 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13 }}>
                  <span style={{ color:C.muted }}>Crypto à recevoir</span>
                  <span style={{ fontWeight:600, color:C.text }}>{amount} {cr.symbol}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13 }}>
                  <span style={{ color:C.muted }}>Taux de change</span>
                  <span style={{ fontWeight:600, color:C.text }}>{fmt(offer.rate)} FCFA/{cr.symbol}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13 }}>
                  <span style={{ color:C.muted }}>Sous-total</span>
                  <span style={{ fontWeight:600, color:C.text }}>{fmt(baseAmount)} FCFA</span>
                </div>
                {networkFee > 0 && (
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13 }}>
                    <span style={{ color:C.gold }}>+ Frais de réseau (vendeur)</span>
                    <span style={{ fontWeight:600, color:C.gold }}>{fmt(networkFee)} FCFA</span>
                  </div>
                )}
                <div style={{ height:1, background:"rgba(255,255,255,0.08)", margin:"10px 0" }}/>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontWeight:700, color:C.text }}>Total à payer</span>
                  <span style={{ fontWeight:900, fontSize:20, color:C.gold }}>{fmt(totalFCFA)} FCFA</span>
                </div>
              </div>
            )}

            <button onClick={handleStep1} style={{ ...st.btn("primary"), width:"100%", justifyContent:"center" }}>
              Voir les infos de paiement →
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:16, padding:22 }}>
            <h2 style={{ fontSize:18, fontWeight:800, marginBottom:6, color:C.text }}>Effectuez le paiement</h2>
            <p style={{ color:C.muted, fontSize:13, marginBottom:22 }}>Payez le vendeur puis confirmez ci-dessous</p>

            <div style={{ background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:12, padding:16, marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontWeight:700, fontSize:14, color:C.text }}>Total à envoyer</span>
              <span style={{ fontWeight:900, fontSize:22, color:C.gold }}>{fmt(totalFCFA)} FCFA</span>
            </div>

            <div style={{ background:"rgba(16,185,129,0.07)", border:"1px solid rgba(16,185,129,0.2)", borderRadius:12, padding:18, marginBottom:20 }}>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:14, color:C.text }}>📱 Coordonnées de paiement du vendeur</div>
              {pi.reseau && (
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10, fontSize:14 }}>
                  <span style={{ color:C.muted }}>Réseau</span>
                  <strong style={{ color:C.text }}>{pi.reseau}</strong>
                </div>
              )}
              {pi.numero && (
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <span style={{ color:C.muted, fontSize:14 }}>Numéro Mobile Money</span>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <strong style={{ fontSize:18, letterSpacing:1, color:C.text }}>{pi.numero}</strong>
                    <button onClick={() => { navigator.clipboard?.writeText(pi.numero); notify("Numéro copié !"); }}
                      style={{ ...st.btn("secondary","sm"), padding:"4px 10px", fontSize:11 }}>📋 Copier</button>
                  </div>
                </div>
              )}
              {pi.lienPaiement && (
                <div style={{ marginTop:10 }}>
                  <a href={pi.lienPaiement.startsWith("http") ? pi.lienPaiement : `https://${pi.lienPaiement}`}
                    target="_blank" rel="noreferrer"
                    style={{ ...st.btn("green"), width:"100%", justifyContent:"center", textDecoration:"none", fontSize:14, display:"flex" }}>
                    💳 Payer via le lien du vendeur
                  </a>
                </div>
              )}
              {!pi.numero && !pi.lienPaiement && (
                <p style={{ color:C.gold, fontSize:13, fontStyle:"italic" }}>⚠️ Contactez directement le vendeur.</p>
              )}
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={{ ...st.label, color:C.text }}>Votre message de confirmation de paiement *</label>
              <textarea
                style={{ ...st.input, resize:"vertical", minHeight:90, lineHeight:1.6 } as any}
                placeholder={`Ex : J'ai envoyé ${fmt(totalFCFA)} FCFA sur ${pi.reseau || "le réseau"} ${pi.numero || ""}`}
                value={payMsg}
                onChange={e => setPayMsg(e.target.value)}
              />
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <button onClick={handleConfirm} disabled={loading}
                style={{ ...st.btn("green"), width:"100%", justifyContent:"center", fontSize:15, opacity:loading ? 0.7 : 1 }}>
                {loading ? "⏳ Envoi..." : "✅ J'ai payé — Confirmer mon paiement"}
              </button>
              <button onClick={() => setStep(1)} style={{ ...st.btn("ghost"), width:"100%", justifyContent:"center" }}>← Modifier</button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:16, padding:22, textAlign:"center" }}>
            <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
            <h2 style={{ fontSize:22, fontWeight:900, marginBottom:8, color:C.text }}>Paiement déclaré !</h2>
            <p style={{ color:C.muted, marginBottom:24, fontSize:14, lineHeight:1.6 }}>
              Commande <strong style={{ color:C.gold }}>{orderId}</strong> en attente.<br/>
              Le vendeur va vérifier et vous envoyer vos cryptos.
            </p>
            <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
              <button onClick={() => navigate("dashboard")} style={st.btn("primary")}>Voir mes commandes →</button>
              <button onClick={() => navigate("marketplace")} style={st.btn("secondary")}>Retour marketplace</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
