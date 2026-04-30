import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";
import {
  MapPin, Phone, MessageCircle, Heart,
  ArrowLeft, BadgeCheck, Crown, Home,
  Copy, CheckCircle2} from "lucide-react";

// ─── Types ────────────────────────────────────────────────
type TypeBien = "maison" | "terrain" | "appartement" | "boutique";
type Statut = "vendre" | "louer" | "disponible" | "vendu" | "loue";

interface Annonce {
  id: string;
  user_id: string;
  auteur_nom: string;
  titre: string;
  description: string;
  prix: number;
  devise?: string;
  type: TypeBien;
  ville: string;
  quartier: string;
  images: string[];
  contact: string;
  whatsapp: string;
  statut: Statut;
  favoris: string[];
  created_at: string;
  superficie?: string;
  nb_chambres?: string;
  nb_salles_bain?: string;
}

interface VendeurInfo {
  id: string;
  nom_prenom: string;
  plan: string;
  is_admin: boolean;
  badge_premium: boolean;
  avatar_url?: string | null;
}

const TYPES: Record<TypeBien, { label: string; emoji: string; color: string }> = {
  maison: { label: "Maison", emoji: "🏠", color: "bg-orange-100 text-orange-700 border-orange-200" },
  terrain: { label: "Terrain", emoji: "🌿", color: "bg-green-100 text-green-700 border-green-200" },
  appartement: { label: "Appartement", emoji: "🏢", color: "bg-blue-100 text-blue-700 border-blue-200" },
  boutique: { label: "Boutique", emoji: "🏪", color: "bg-purple-100 text-purple-700 border-purple-200" },
};

const STATUTS: Record<string, { label: string; color: string }> = {
  vendre:     { label: "À vendre", color: "bg-green-500" },
  louer:      { label: "À louer",  color: "bg-orange-500" },
  // anciens statuts (rétrocompatibilité)
  disponible: { label: "Disponible", color: "bg-green-500" },
  vendu:      { label: "Vendu",      color: "bg-red-500"   },
  loue:       { label: "Loué",       color: "bg-yellow-500"},
};

function formatPrix(prix: number, devise?: string): string {
  const formatted = prix.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (devise === "USD") return `$${formatted}`;
  if (devise === "EUR") return `${formatted} €`;
  return `${formatted} ${devise || "FCFA"}`;
}

const PLATFORM_LOGO = "https://i.postimg.cc/c1QgbZsG/ei_1773937801458_removebg_preview.png";

export default function ProfilVendeurPage() {
  const { userId } = useParams<{ userId: string }>();
  const currentUser = getNexoraUser();

  const [vendeur, setVendeur] = useState<VendeurInfo | null>(null);
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<TypeBien | "">("");
  const [filterStatut, setFilterStatut] = useState<Statut | "">("");
  const [copied, setCopied] = useState(false);

  const currentUserId = currentUser?.id || "guest";
  const profileUrl = `${window.location.origin}/immobilier/vendeur/${userId}`;

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);

      // Charger infos vendeur
      const { data: vendeurData } = await supabase
        .from("nexora_users" as any)
        .select("id, nom_prenom, plan, is_admin, badge_premium, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (vendeurData) setVendeur(vendeurData as unknown as VendeurInfo);

      // Charger annonces du vendeur
      const { data: annoncesData } = await supabase
        .from("nexora_annonces_immo" as any)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      setAnnonces((annoncesData || []) as unknown as Annonce[]);
      setLoading(false);
    };
    load();
  }, [userId]);

  const handleFavori = async (id: string) => {
    const annonce = annonces.find(a => a.id === id);
    if (!annonce) return;
    const favoris = annonce.favoris || [];
    const newFavoris = favoris.includes(currentUserId)
      ? favoris.filter(f => f !== currentUserId)
      : [...favoris, currentUserId];
    await supabase
      .from("nexora_annonces_immo" as any)
      .update({ favoris: newFavoris })
      .eq("id", id);
    setAnnonces(prev => prev.map(a => a.id === id ? { ...a, favoris: newFavoris } : a));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = annonces.filter(a => {
    const matchType = !filterType || a.type === filterType;
    const matchStatut = !filterStatut || a.statut === filterStatut;
    return matchType && matchStatut;
  });

  const isPremium = vendeur?.plan === "premium" || vendeur?.is_admin;

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!vendeur) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-5xl mb-3">👤</p>
        <p className="font-bold text-gray-700">Vendeur introuvable</p>
        <Link to="/immobilier" className="mt-4 inline-block text-violet-600 text-sm hover:underline">
          ← Retour au marché
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/immobilier"
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <span className="font-bold text-gray-800 flex-1 truncate">
            Boutique de {vendeur.nom_prenom}
          </span>

        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* ── Carte vendeur ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-5">

            {/* Avatar avec badge */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-full bg-white border-4 border-violet-200 shadow-md flex items-center justify-center overflow-hidden">
                {vendeur.avatar_url
                  ? <img src={vendeur.avatar_url} alt={vendeur.nom_prenom} className="w-full h-full object-cover" />
                  : <img src={PLATFORM_LOGO} alt="Logo" className="w-14 h-14 object-contain" />
                }
              </div>
              {isPremium && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                  <BadgeCheck className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {/* Infos */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-black text-xl text-gray-900">{vendeur.nom_prenom}</h1>
                {vendeur.is_admin && (
                  <span className="text-xs bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Admin
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm mt-0.5">
                {annonces.length} annonce{annonces.length > 1 ? "s" : ""} publiée{annonces.length > 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {annonces.filter(a => a.statut === "vendre" || a.statut === "disponible").length} à vendre
                </span>
                <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-1 rounded-full">
                  {annonces.filter(a => a.statut === "louer" || a.statut === "loue").length} à louer
                </span>
              </div>
            </div>
          </div>

          {/* Lien profil copiable */}
          <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 mb-0.5">Lien de cette boutique</p>
              <p className="text-xs text-violet-600 font-mono truncate">{profileUrl}</p>
            </div>
            <button onClick={handleCopyLink}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                copied
                  ? "bg-green-500 text-white"
                  : "bg-violet-600 text-white hover:bg-violet-700"
              }`}>
              {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copié !" : "Copier"}
            </button>
          </div>
        </div>

        {/* ── Filtres ── */}
        <div className="space-y-3">
          {/* Types */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setFilterType("")}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                !filterType ? "bg-violet-600 text-white border-violet-600" : "bg-white text-gray-600 border-gray-200"
              }`}>
              🏘️ Tout ({annonces.length})
            </button>
            {(Object.entries(TYPES) as [TypeBien, typeof TYPES[TypeBien]][]).map(([key, val]) => {
              const count = annonces.filter(a => a.type === key).length;
              if (count === 0) return null;
              return (
                <button key={key} onClick={() => setFilterType(filterType === key ? "" : key)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    filterType === key ? "bg-violet-600 text-white border-violet-600" : "bg-white text-gray-600 border-gray-200"
                  }`}>
                  {val.emoji} {val.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Statuts */}
          <div className="flex gap-2">
            <button onClick={() => setFilterStatut("")}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                !filterStatut ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-500 border-gray-200"
              }`}>
              Tous
            </button>
            <button onClick={() => setFilterStatut(filterStatut === "vendre" ? "" : "vendre")}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                filterStatut === "vendre" ? "bg-green-500 text-white border-transparent" : "bg-white text-gray-500 border-gray-200"
              }`}>
              🏷️ À vendre
            </button>
            <button onClick={() => setFilterStatut(filterStatut === "louer" ? "" : "louer")}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                filterStatut === "louer" ? "bg-orange-500 text-white border-transparent" : "bg-white text-gray-500 border-gray-200"
              }`}>
              🔑 À louer
            </button>
          </div>
        </div>

        {/* ── Annonces ── */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <p className="text-4xl mb-3">🏘️</p>
            <p className="font-bold text-gray-700">
              {annonces.length === 0 ? "Aucune annonce publiée" : "Aucun résultat"}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {annonces.length === 0
                ? "Ce vendeur n'a pas encore publié d'annonce."
                : "Modifiez les filtres pour voir plus de résultats."
              }
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 font-medium">
              {filtered.length} annonce{filtered.length > 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(annonce => {
                const typeInfo = TYPES[annonce.type] || TYPES["maison"];
                const statutInfo = STATUTS[annonce.statut] || { label: annonce.statut, color: "bg-gray-400" };
                const isFavori = annonce.favoris?.includes(currentUserId);
                const photo = annonce.images?.[0];

                return (
                  <div key={annonce.id}
                    className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group">

                    {/* Image */}
                    <div className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                      {photo ? (
                        <img src={photo} alt={annonce.titre}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-6xl">{typeInfo.emoji}</span>
                        </div>
                      )}

                      <div className={`absolute top-3 left-3 ${statutInfo.color} text-white text-xs font-bold px-2.5 py-1 rounded-full`}>
                        {statutInfo.label}
                      </div>

                      <button onClick={() => handleFavori(annonce.id)}
                        className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-all ${
                          isFavori ? "bg-red-500 text-white" : "bg-white/80 text-gray-600 hover:bg-white"
                        }`}>
                        <Heart className={`w-4 h-4 ${isFavori ? "fill-white" : ""}`} />
                      </button>
                    </div>

                    {/* Contenu */}
                    <div className="p-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${typeInfo.color}`}>
                        {typeInfo.emoji} {typeInfo.label}
                      </span>

                      <h3 className="font-bold text-gray-900 mt-2 line-clamp-1">{annonce.titre}</h3>

                      <div className="flex items-center gap-1 mt-1 text-gray-500 text-sm">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">
                          {annonce.quartier ? `${annonce.quartier}, ` : ""}{annonce.ville}
                        </span>
                      </div>

                      <p className="text-violet-600 font-black text-lg mt-2">{formatPrix(annonce.prix, annonce.devise)}</p>

                      {/* Détails superficie / chambres */}
                      {(annonce.superficie || annonce.nb_chambres || annonce.nb_salles_bain) && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {annonce.superficie && (
                            <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-lg px-2 py-0.5 font-semibold">
                              📐 {annonce.superficie} m²
                            </span>
                          )}
                          {annonce.nb_chambres && (
                            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-2 py-0.5 font-semibold">
                              🛏️ {annonce.nb_chambres} ch.
                            </span>
                          )}
                          {annonce.nb_salles_bain && (
                            <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-lg px-2 py-0.5 font-semibold">
                              🚿 {annonce.nb_salles_bain} SDB
                            </span>
                          )}
                        </div>
                      )}

                      {/* Actions contact */}
                      <div className="flex gap-2 mt-3">
                        {annonce.whatsapp && (
                          <a href={`https://wa.me/${annonce.whatsapp.replace(/[^0-9]/g, "")}?text=Bonjour, je suis intéressé par : ${annonce.titre}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex-1 py-2 rounded-xl bg-[#25D366] text-white text-xs font-bold flex items-center justify-center gap-1 hover:opacity-90">
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                          </a>
                        )}
                        <a href={`tel:${annonce.contact}`}
                          className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold flex items-center justify-center gap-1 hover:bg-gray-200">
                          <Phone className="w-3.5 h-3.5" /> Appeler
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <Link to="/immobilier"
            className="text-sm text-violet-600 hover:underline font-medium flex items-center justify-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Retour au Marché Immobilier
          </Link>
        </div>

      </div>
    </div>
  );
}
