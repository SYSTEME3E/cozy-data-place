import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DeviseProvider } from "@/lib/devise-context";
import { CartProvider } from "@/lib/cart-context";
import SmartCartDrawer from "@/components/SmartCartDrawer";
import CheckoutPage from "@/pages/boutique/CheckoutPage";
import NexoraAuthGuard from "@/components/NexoraAuthGuard";
import NexoraSplash from "@/components/NexoraSplash";
import { hasNexoraPremium } from "@/lib/nexora-auth";
import { Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import AIAssistant from "@/components/AIAssistant";
import { useState, useEffect } from "react";


// Auth
import NexoraLoginPage from "@/pages/NexoraLoginPage";
import NexoraRegisterPage from "@/pages/NexoraRegisterPage";
import LandingPage from "@/pages/LandingPage";
import CGUPage from "@/pages/CGUPage";
import CGVPage from "@/pages/CGVPage";
import PrivacyPage from "@/pages/PrivacyPage";
import CookiesPage from "@/pages/CookiesPage";
import MentionsLegalesPage from "@/pages/MentionsLegalesPage";

// PIN Security
import SetupPinPage from "@/pages/SetupPinPage";
import UnlockPinPage from "@/pages/UnlockPinPage";

// Pages Dashboard / Finance
import DashboardPage from "@/pages/DashboardPage";
import CoffreFortPage from "@/pages/CoffreFortPage";
import MediasPage from "@/pages/MediasPage";
import LiensPage from "@/pages/LiensPage";
import ProfilPage from "@/pages/ProfilPage";
import PretsPage from "@/pages/PretsPage";
import FormationsPage from "@/pages/FormationsPage";
import FormationDetailPage from "@/pages/FormationDetailPage";
import MesFormationsPage from "@/pages/MesFormationsPage";
import AdminFormationsPage from "@/pages/AdminFormationsPage";
import TransfertPage from "@/pages/Transfertpage";
import CoursPage from "@/pages/CoursPage";
import VideoPlayerPage from "@/pages/VideoPlayerPage";
import NexoraAcademy from "@/pages/NexoraAcademy";
import SupportPage from "@/pages/SupportPage";
import CommunautePage from "@/pages/CommunautePage";
import AProposPage from "@/pages/AProposPage";

// Boutique
import BoutiqueAccueilPage from "@/pages/boutique/AccueilPage";
import BoutiqueProduitsPage from "@/pages/boutique/ProduitsPage";
import NouveauProduitPage from "@/pages/boutique/NouveauProduitPage";
import ProduitsDigitauxPage from "@/pages/boutique/ProduitsDigitauxPage";
import CommandesPage from "@/pages/boutique/CommandesPage";
import PrixInteretPage from "@/pages/boutique/PrixInteretPage";
import VentesDigitalesPage from "@/pages/boutique/VentesDigitalesPage";
import PerformancePage from "@/pages/boutique/PerformancePage";
import BoutiqueParametresPage from "@/pages/boutique/ParametresPage";
import BoutiqueVitrinePage from "@/pages/boutique/VitrinePage";
import ProduitDetailPage from "@/pages/boutique/ProduitDetailPage";
import DigitalProductPublicPage from "@/pages/boutique/DigitalProductPublicPage";
import DigitalPaymentCallbackPage from "@/pages/DigitalPaymentCallbackPage";
import PortefeuillePage from "@/pages/boutique/PortefeuillePage";
import AcheterPage from "@/pages/boutique/AcheterPage";
import ClientsPage from "@/pages/boutique/ClientsPage";
import MessagesBoutiquePage from "@/pages/boutique/MessagesBoutiquePage";
import MessagesVendeurPage from "@/pages/boutique/MessagesVendeurPage";
import CommandeTrackingPage from "@/pages/boutique/CommandeTrackingPage";
import CampagnesPage from "@/pages/boutique/CampagnesPage";
import CampagneAnalyticsPage from "@/pages/boutique/CampagneAnalyticsPage";
import FacturesPage from "@/pages/boutique/FacturesPage"; // ✅ déplacé dans boutique
import LegacyProduitRedirect from "@/pages/LegacyProduitRedirect"; // SEO slug migration

// Immobilier
import ImmobilierPage from "@/pages/ImmobilierPage";
import AnnonceDetailPage from "@/pages/AnnonceDetailPage";
import ProfilVendeurPage from "@/pages/ProfilVendeurPage";

// Abonnement & Paiement
import AbonnementPage from "@/pages/AbonnementPage";
import PaymentCallbackPage from "@/pages/PaymentCallbackPage";

// PayLink
import PayLinkPage from "@/pages/PayLinkPage";
import PayLinkCheckoutPage from "@/pages/PayLinkCheckoutPage";

// Contacts WhatsApp
import ContactsWhatsAppPage from "@/pages/ContactsWhatsAppPage";

// NEXORA PUBLIC SHOP (Marketplace publique)
import NexoraPublicShopPage from "@/pages/NexoraPublicShopPage";

// YUPI
import YupiPublicShopPage from "@/pages/boutique/YupiPublicShopPage";

// YUPI GLOBAL SHOP
import YupiGlobalShopPage from "@/pages/YupiGlobalShopPage";
import YupiCommandesPage from "@/pages/YupiCommandesPage";

// Admin
import AdminPanelPage from "@/pages/AdminPanelPage";

// Services de paiement
import ElectricitePage from "@/pages/ElectricitePage";
import CanalPlusPage from "@/pages/CanalPlusPage";



import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

// ─── Détection app mobile (Capacitor) ─────────────────────────────────────────
const isNativeApp = (): boolean => {
  return typeof (window as any).Capacitor !== "undefined";
};

// ─── Guards ────────────────────────────────────────────────────────────────────

const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <NexoraAuthGuard>
    {children}
  </NexoraAuthGuard>
);

const AdminPage = ({ children }: { children: React.ReactNode }) => (
  <NexoraAuthGuard requireAdmin>
    {children}
  </NexoraAuthGuard>
);

function PremiumWall() {
  const navigate = useNavigate();
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center mb-6 shadow-lg">
          <Crown className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-black text-foreground mb-2">Fonctionnalité Premium</h2>
        <p className="text-muted-foreground text-sm mb-1 max-w-xs">
          Cette section est réservée aux membres{" "}
          <span className="font-bold text-yellow-600">Premium</span>.
        </p>
        <p className="text-muted-foreground text-xs mb-8 max-w-xs">
          Passez au plan Premium pour accéder à toutes les fonctionnalités sans limite.
        </p>
        <button
          onClick={() => navigate("/abonnement")}
          className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white font-bold px-8 py-3 rounded-xl shadow-md transition-all"
        >
          <Crown className="w-4 h-4" /> Voir les plans
        </button>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Retour au tableau de bord
        </button>
      </div>
    </AppLayout>
  );
}

const PremiumPage = ({ children }: { children: React.ReactNode }) => {
  const isPremium = hasNexoraPremium();
  return (
    <NexoraAuthGuard>
      {isPremium ? children : <PremiumWall />}
    </NexoraAuthGuard>
  );
};

// ─── Application Principale ────────────────────────────────────────────────────

const App = () => {
  const [splashDone, setSplashDone] = useState(!isNativeApp());

  return (
    <QueryClientProvider client={queryClient}>
      <DeviseProvider>
        {!splashDone && !window.location.pathname.startsWith('/boutique') && (
          <NexoraSplash duration={2200} onDone={() => setSplashDone(true)} />
        )}

        <CartProvider>
        <BrowserRouter>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <SmartCartDrawer />
            <AIAssistant />

            <Routes>
              <Route
                path="/"
                element={
                  isNativeApp()
                    ? <Navigate to="/login" replace />
                    : <LandingPage />
                }
              />

              {/* Public / Auth */}
              <Route path="/login"    element={<NexoraLoginPage />} />
              <Route path="/register" element={<NexoraRegisterPage />} />
              <Route path="/cgu"              element={<CGUPage />} />
              <Route path="/cgv"              element={<CGVPage />} />
              <Route path="/confidentialite"  element={<PrivacyPage />} />
              <Route path="/cookies"          element={<CookiesPage />} />
              <Route path="/mentions-legales" element={<MentionsLegalesPage />} />

              {/* PIN Security */}
              <Route path="/setup-pin"  element={<SetupPinPage />} />
              <Route path="/unlock-pin" element={<UnlockPinPage />} />

              {/* Dashboard / Finance */}
              <Route path="/dashboard"   element={<ProtectedPage><DashboardPage /></ProtectedPage>} />
              <Route path="/coffre-fort" element={<AdminPage><CoffreFortPage /></AdminPage>} />
              <Route path="/liens"       element={<AdminPage><LiensPage /></AdminPage>} />
              <Route path="/profil"      element={<ProtectedPage><ProfilPage /></ProtectedPage>} />
              <Route path="/abonnement"  element={<ProtectedPage><AbonnementPage /></ProtectedPage>} />
              <Route path="/transfert"   element={<ProtectedPage><TransfertPage /></ProtectedPage>} />
              <Route path="/prets"       element={<AdminPage><PretsPage /></AdminPage>} />
              <Route path="/formations"      element={<FormationsPage />} />
              <Route path="/formations/:id"  element={<FormationDetailPage />} />
              <Route path="/mes-formations"  element={<ProtectedPage><MesFormationsPage /></ProtectedPage>} />
              <Route path="/mes-formations/:id/cours"                element={<ProtectedPage><CoursPage /></ProtectedPage>} />
              <Route path="/mes-formations/:courseId/video/:videoId" element={<ProtectedPage><VideoPlayerPage /></ProtectedPage>} />
              <Route path="/nexora-academy"  element={<NexoraAcademy />} />
              <Route path="/support"         element={<ProtectedPage><SupportPage /></ProtectedPage>} />
              <Route path="/communaute"      element={<ProtectedPage><CommunautePage /></ProtectedPage>} />
              <Route path="/a-propos"        element={<ProtectedPage><AProposPage /></ProtectedPage>} />

              {/* Callback Paiement */}
              <Route path="/payment/callback" element={<ProtectedPage><PaymentCallbackPage /></ProtectedPage>} />
              <Route path="/payment/digital-callback" element={<DigitalPaymentCallbackPage />} />

              {/* PayLink */}
              <Route path="/pay/:paylinkSlug" element={<PayLinkCheckoutPage />} />
              <Route path="/paylink"          element={<ProtectedPage><PayLinkPage /></ProtectedPage>} />

              {/* Premium */}
              <Route path="/contacts-whatsapp"      element={<PremiumPage><ContactsWhatsAppPage /></PremiumPage>} />
              <Route path="/immobilier"             element={<ImmobilierPage />} />
              <Route path="/immobilier/annonce/:id" element={<AnnonceDetailPage />} />

              {/* Boutique */}
              <Route path="/boutique"               element={<ProtectedPage><BoutiqueAccueilPage /></ProtectedPage>} />
              <Route path="/boutique/produits"               element={<ProtectedPage><BoutiqueProduitsPage /></ProtectedPage>} />
              <Route path="/boutique/produits/nouveau"       element={<ProtectedPage><NouveauProduitPage /></ProtectedPage>} />
              <Route path="/boutique/produits/modifier/:id"  element={<ProtectedPage><NouveauProduitPage /></ProtectedPage>} />
              <Route path="/boutique/digitaux"    element={<ProtectedPage><ProduitsDigitauxPage /></ProtectedPage>} />
              <Route path="/boutique/commandes"   element={<ProtectedPage><CommandesPage /></ProtectedPage>} />
              <Route path="/boutique/prix-interet" element={<ProtectedPage><PrixInteretPage /></ProtectedPage>} />
              <Route path="/boutique/ventes-digitales"  element={<ProtectedPage><VentesDigitalesPage /></ProtectedPage>} />
              <Route path="/boutique/clients"     element={<ProtectedPage><ClientsPage /></ProtectedPage>} />
              <Route path="/boutique/messages"    element={<ProtectedPage><MessagesBoutiquePage /></ProtectedPage>} />
              <Route path="/boutique/messages-vendeur" element={<ProtectedPage><MessagesVendeurPage /></ProtectedPage>} />
              <Route path="/boutique/performance" element={<ProtectedPage><PerformancePage /></ProtectedPage>} />
              <Route path="/boutique/parametres"  element={<ProtectedPage><BoutiqueParametresPage /></ProtectedPage>} />
              <Route path="/boutique/portefeuille" element={<ProtectedPage><PortefeuillePage /></ProtectedPage>} />
              <Route path="/boutique/campagnes"    element={<ProtectedPage><CampagnesPage /></ProtectedPage>} />
              <Route path="/boutique/campagnes/:id/analytics" element={<ProtectedPage><CampagneAnalyticsPage /></ProtectedPage>} />
              <Route path="/boutique/factures"     element={<ProtectedPage><FacturesPage /></ProtectedPage>} />
              <Route path="/boutique/vitrine"      element={<ProtectedPage><BoutiqueVitrinePage /></ProtectedPage>} />

              {/* Redirection ancienne route /factures → /boutique/factures */}
              <Route path="/factures" element={<Navigate to="/boutique/factures" replace />} />

              {/* Vitrines publiques */}
              <Route path="/shop/:slug"                          element={<BoutiqueVitrinePage />} />
              <Route path="/shop/:slug/produit/:produitSlug"     element={<ProduitDetailPage />} />
              <Route path="/shop/:slug/digital/:produitSlug"     element={<DigitalProductPublicPage />} />
              <Route path="/shop/:slug/acheter/:produitSlug"     element={<AcheterPage />} />
              <Route path="/shop/:slug/checkout"                 element={<CheckoutPage />} />
              {/* Redirections 301 legacy UUID → slug (conserver 6 mois minimum) */}
              <Route path="/shop/:slug/produit/:legacyId/redirect" element={<LegacyProduitRedirect type="produit" />} />
              <Route path="/shop/:slug/digital/:legacyId/redirect" element={<LegacyProduitRedirect type="digital" />} />
              <Route path="/shop/:slug/acheter/:legacyId/redirect" element={<LegacyProduitRedirect type="acheter" />} />
              <Route path="/immobilier/vendeur/:userId"    element={<ProfilVendeurPage />} />
              <Route path="/commande/:commandeId"          element={<CommandeTrackingPage />} />

              {/* NEXORA SHOP — Marketplace publique (sans compte requis) */}
              <Route path="/nexora-shop" element={<NexoraPublicShopPage />} />

              {/* YUPI — Page publique dans /boutique */}
              <Route path="/boutique/bien-etre-yupi" element={<YupiPublicShopPage />} />
              <Route path="/bien-etre-yupi" element={<Navigate to="/boutique/bien-etre-yupi" replace />} />

              {/* YUPI GLOBAL SHOP (connecté) */}
              <Route path="/yupi-shop" element={<ProtectedPage><YupiGlobalShopPage /></ProtectedPage>} />
              <Route path="/yupi-commandes" element={<AdminPage><YupiCommandesPage /></AdminPage>} />

              {/* Services de paiement */}
              <Route path="/electricite" element={<ProtectedPage><ElectricitePage /></ProtectedPage>} />
              <Route path="/canal-plus"  element={<ProtectedPage><CanalPlusPage /></ProtectedPage>} />

              {/* Admin */}
              <Route path="/admin"            element={<AdminPage><AdminPanelPage /></AdminPage>} />
              <Route path="/medias"           element={<AdminPage><MediasPage /></AdminPage>} />
              <Route path="/admin/formations" element={<AdminPage><AdminFormationsPage /></AdminPage>} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </BrowserRouter>
        </CartProvider>
      </DeviseProvider>
    </QueryClientProvider>
  );
};

export default App;
