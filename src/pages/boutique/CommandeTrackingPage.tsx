import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, MessageCircle, Package, ArrowLeft, Phone, Mail, Store } from "lucide-react";

interface Commande {
  id: string;
  numero: string;
  boutique_id: string;
}

interface Boutique {
  id: string;
  nom: string;
  whatsapp: string;
  telephone: string;
  email: string;
  adresse: string;
  ville: string;
  pays: string;
}

export default function CommandeTrackingPage() {
  const { commandeId } = useParams<{ commandeId: string }>();
  const navigate = useNavigate();

  const [commande, setCommande] = useState<Commande | null>(null);
  const [boutique, setBoutique] = useState<Boutique | null>(null);
  const [loading, setLoading] = useState(true);

  // Forcer le mode clair sur cette page
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    loadCommande();
  }, [commandeId]);

  const loadCommande = async () => {
    if (!commandeId) return;

    const { data } = await supabase
      .from("commandes" as any)
      .select("id, numero, boutique_id")
      .eq("id", commandeId)
      .maybeSingle();

    if (data) {
      const cmd = data as unknown as Commande;
      setCommande(cmd);

      const { data: shop } = await supabase
        .from("boutiques" as any)
        .select("id, nom, whatsapp, telephone, email, adresse, ville, pays")
        .eq("id", cmd.boutique_id)
        .maybeSingle();

      if (shop) setBoutique(shop as unknown as Boutique);
    }

    setLoading(false);
  };

  const whatsappLink = boutique?.whatsapp
    ? `https://wa.me/${boutique.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Bonjour ! J'ai passé la commande #${commande?.numero} sur ${boutique.nom}. Merci de me contacter.`
      )}`
    : null;

  const telLink = boutique?.telephone
    ? `tel:${boutique.telephone.replace(/\s/g, "")}`
    : null;

  const mailLink = boutique?.email ? `mailto:${boutique.email}` : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!commande || !boutique) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Package className="w-16 h-16 text-gray-300" />
        <h1 className="text-xl font-black text-gray-800">Commande introuvable</h1>
        <p className="text-sm text-gray-500">Ce lien est invalide ou la commande n'existe plus.</p>
        <button onClick={() => navigate("/")} className="text-pink-600 underline text-sm font-semibold">
          Retour à l'accueil
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <p className="font-black text-sm text-gray-900">Contact vendeur</p>
            <p className="text-xs text-gray-500">Commande #{commande.numero}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Identité boutique */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-pink-100 flex items-center justify-center flex-shrink-0">
            <Store className="w-7 h-7 text-pink-500" />
          </div>
          <div className="min-w-0">
            <p className="font-black text-gray-900 text-base truncate">{boutique.nom}</p>
            {(boutique.ville || boutique.pays) && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                {[boutique.ville, boutique.pays].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>

        {/* Adresse physique */}
        {boutique.adresse && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="font-black text-sm text-gray-900 mb-0.5">Adresse</p>
                <p className="text-sm text-gray-600 leading-relaxed">{boutique.adresse}</p>
                {(boutique.ville || boutique.pays) && (
                  <p className="text-sm text-gray-500">
                    {[boutique.ville, boutique.pays].filter(Boolean).join(" — ")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp */}
        {whatsappLink && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-green-300 hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
              <MessageCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm text-gray-900">WhatsApp</p>
              <p className="text-sm text-gray-500">{boutique.whatsapp}</p>
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
              Contacter
            </span>
          </a>
        )}

        {/* Téléphone */}
        {telLink && (
          <a
            href={telLink}
            className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm text-gray-900">Téléphone</p>
              <p className="text-sm text-gray-500">{boutique.telephone}</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              Appeler
            </span>
          </a>
        )}

        {/* Email */}
        {mailLink && boutique.email && (
          <a
            href={mailLink}
            className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-purple-300 hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition-colors">
              <Mail className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm text-gray-900">Email</p>
              <p className="text-sm text-gray-500 truncate">{boutique.email}</p>
            </div>
            <span className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
              Écrire
            </span>
          </a>
        )}

        {!whatsappLink && !telLink && !mailLink && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
            <p className="text-gray-400 text-sm">Aucun contact disponible pour ce vendeur.</p>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-2">
          Commande #{commande.numero} · {boutique.nom}
        </p>
      </div>
    </div>
  );
}
