// ─── CryptoMarketplacePage.tsx ────────────────────────────────────────────────
// Page principale du marketplace — liste des offres crypto P2P
import { useState } from "react";
import { C, CRYPTOS, getCr, fmt, makeStyles } from "./crypto-constants";
import { TopNav } from "./CryptoSharedComponents";

const PAYS_LISTE = [
  "Bénin","Togo","Niger","Mali","Burkina Faso","Côte d'Ivoire","Sénégal","Cameroun",
  "Ghana","Nigeria","Congo","Gabon","Guinée","Madagascar","Rwanda","Kenya","Maroc",
  "Tunisie","Algérie","Égypte","France","Belgique","Suisse","Canada","USA","Autre",
];

export default function CryptoMarketplacePage({ navigate, user, onLogout, offers, notify }: any) {
  const st = makeStyles();
  const [filterCrypto, setFilterCrypto] = useState("all");
  const [filterCountry, setFilterCountry] = useState("");
  const [search, setSearch] = useState("");

  const filtered = offers.filter((o: any) => {
    if (filterCrypto !== "all" && o.crypto !== filterCrypto) return false;
    if (filterCountry && o.allowedCountries?.length > 0 && !o.allowedCountries.includes(filterCountry)) return false;
    if (search && !o.sellerName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <TopNav navigate={navigate} user={user} onLogout={onLogout} />

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "48px 24px 32px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, marginBottom: 8 }}>
          🔥 Marketplace <span style={{ color: C.gold }}>Crypto P2P</span>
        </h1>
        <p style={{ color: C.muted, fontSize: 14, maxWidth: 500, margin: "0 auto" }}>
          Achetez des crypto-monnaies directement auprès de vendeurs vérifiés
        </p>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 60px" }}>

        {/* Filtres */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
          <select style={{ ...st.input, width: "auto", minWidth: 160 }} value={filterCrypto}
            onChange={e => setFilterCrypto(e.target.value)}>
            <option value="all">Toutes les cryptos</option>
            {CRYPTOS.map(cr => <option key={cr.id} value={cr.id}>{cr.name}</option>)}
          </select>
          <select style={{ ...st.input, width: "auto", minWidth: 160 }} value={filterCountry}
            onChange={e => setFilterCountry(e.target.value)}>
            <option value="">Tous les pays</option>
            {PAYS_LISTE.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input style={{ ...st.input, flex: 1, minWidth: 140 }} placeholder="🔍 Rechercher un vendeur..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Stats bar */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { l: "Offres actives", v: offers.length, col: C.green },
            { l: "Cryptos disponibles", v: [...new Set(offers.map((o: any) => o.crypto))].length, col: C.blue },
          ].map(s => (
            <div key={s.l} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 18px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontWeight: 900, fontSize: 20, color: s.col }}>{s.v}</span>
              <span style={{ fontSize: 12, color: C.muted }}>{s.l}</span>
            </div>
          ))}
        </div>

        {/* Offers list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: C.muted }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📭</div>
            <p style={{ fontSize: 16, marginBottom: 8 }}>Aucune offre disponible</p>
            <p style={{ fontSize: 13 }}>Revenez plus tard ou changez vos filtres</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((offer: any) => {
              const cr = getCr(offer.crypto);
              const cryptoName = offer.customCryptoName || cr.name;
              return (
                <div key={offer.id} style={{
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  borderRadius: 16,
                  padding: 20,
                  transition: "border-color 0.2s",
                  cursor: "pointer",
                }} onClick={() => navigate("buy", { offer })}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    {/* Seller */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 180px" }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: "50%",
                        background: "linear-gradient(135deg,#0f2035,#1e3a5f)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, color: C.gold, fontSize: 16, flexShrink: 0, overflow: "hidden",
                      }}>
                        {offer.sellerAvatar?.length > 2
                          ? <img src={offer.sellerAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : offer.sellerAvatar || offer.sellerName?.[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{offer.sellerName}</div>
                        {offer.allowedCountries?.length > 0 && (
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                            🌍 {offer.allowedCountries.slice(0, 3).join(", ")}{offer.allowedCountries.length > 3 ? ` +${offer.allowedCountries.length - 3}` : ""}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Crypto */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 140px" }}>
                      <span style={{ color: cr.color, fontSize: 22 }}>{cr.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{cryptoName}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{cr.network}</div>
                      </div>
                    </div>

                    {/* Rate */}
                    <div style={{ flex: "1 1 120px", textAlign: "right" }}>
                      <div style={{ fontWeight: 900, color: C.gold, fontSize: 18 }}>{fmt(offer.rate)}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>FCFA / {cr.symbol}</div>
                    </div>

                    {/* Limits */}
                    <div style={{ flex: "1 1 120px", textAlign: "right" }}>
                      <div style={{ fontSize: 12, color: C.muted }}>
                        {offer.minAmount} – {fmt(offer.maxAmount)} {cr.symbol}
                      </div>
                      {offer.networkFee > 0 && (
                        <div style={{ fontSize: 11, color: C.gold, marginTop: 2 }}>
                          + {fmt(offer.networkFee)} FCFA frais
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate("buy", { offer }); }}
                      style={{ ...st.btn("primary", "sm"), flexShrink: 0 }}>
                      Acheter →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
