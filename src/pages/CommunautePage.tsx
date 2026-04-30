import AppLayout from "@/components/AppLayout";
import { ChevronLeft, Users, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

const WHATSAPP_COMMUNITY_LINK = "https://chat.whatsapp.com/BCBOcRIFGr6LoRPyMiXRAp";

export default function CommunautePage() {
  const navigate = useNavigate();

  const handleJoin = () => {
    window.open(WHATSAPP_COMMUNITY_LINK, "_blank");
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#EEF2FF] dark:bg-background flex flex-col">
        {/* Header */}
        <div className="flex items-center px-4 pt-6 pb-2">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-card shadow-sm mr-3"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Rejoindre la communauté</h1>
        </div>

        <div className="flex flex-col items-center mt-10 px-6">
          {/* Icon */}
          <div className="w-24 h-24 rounded-3xl bg-[#25D366] flex items-center justify-center shadow-lg mb-6">
            <svg viewBox="0 0 24 24" className="w-12 h-12 fill-white" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>

          <h2 className="text-2xl font-extrabold text-foreground mb-2 text-center">
            Communauté Nexora
          </h2>
          <p className="text-sm text-muted-foreground text-center leading-relaxed mb-8 max-w-xs">
            Rejoignez notre groupe WhatsApp pour rester informé des nouveautés, partager vos expériences et bénéficier de l'aide de la communauté.
          </p>

          {/* Benefits */}
          <div className="w-full bg-white dark:bg-card rounded-2xl p-5 mb-8 shadow-sm">
            <h3 className="font-bold text-foreground text-sm mb-4">Ce que vous trouverez dans la communauté :</h3>
            <div className="space-y-3">
              {[
                { emoji: "📢", text: "Annonces et mises à jour de la plateforme" },
                { emoji: "💡", text: "Conseils et astuces d'utilisation" },
                { emoji: "🤝", text: "Entraide entre membres" },
                { emoji: "🎁", text: "Offres et promotions exclusives" },
                { emoji: "📊", text: "Opportunités business et partenariats" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xl">{item.emoji}</span>
                  <span className="text-sm text-muted-foreground">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleJoin}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-[#25D366] hover:bg-green-500 text-white font-bold text-base transition-colors shadow-md"
          >
            <Users className="w-5 h-5" />
            Rejoindre le groupe WhatsApp
            <ExternalLink className="w-4 h-4 opacity-80" />
          </button>

          <p className="text-xs text-muted-foreground text-center mt-4 px-4">
            En rejoignant le groupe, vous acceptez les règles de bonne conduite de la communauté Nexora.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
