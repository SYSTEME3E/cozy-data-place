import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DeviseProvider } from "@/lib/devise-context";
import NexoraAuthGuard from "@/components/NexoraAuthGuard";
import PageLoader from "@/components/PageLoader";
import NexoraSplash from "@/components/NexoraSplash";
import { hasNexoraPremium } from "@/lib/nexora-auth";
import { Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useState, useEffect } from "react";

// Auth
import NexoraLoginPage from "@/pages/NexoraLoginPage";
import LandingPage from "@/pages/LandingPage";
import CGUPage from "@/pages/CGUPage";
import PrivacyPage from "@/pages/PrivacyPage";

// PIN Security
import SetupPinPage from "@/pages/SetupPinPage";
import UnlockPinPage from "@/pages/UnlockPinPage";

// Pages Dashboard / Finance
import DashboardPage from "@/pages/DashboardPage";
import HistoriquePage from "@/pages/HistoriquePage";
import CoffreFortPage from "@/pages/CoffreFortPage";
import MediasPage from "@/pages/MediasPage";
import LiensPage from "@/pages/LiensPage";
import ProfilPage from "@/pages/ProfilPage";
import PretsPage from "@/pages/PretsPage";
import FacturesPage from "@/pages/FacturesPage";
import EntreesDepensesPage from "@/pages/EntreesDepensesPage";
import TransfertPage from "@/pages/Transfertpage";

// Boutique
import BoutiqueAccueilPage from "@/pages/boutique/AccueilPage";
import BoutiqueProduitsPage from "@/pages/boutique/ProduitsPage";
import CommandesPage from "@/pages/boutique/CommandesPage";
import BoutiqueParametresPage from "@/pages/boutique/ParametresPage";
import BoutiqueVitrinePage from "@/pages/boutique/VitrinePage";
import ProduitDetailPage from "@/pages/boutique/ProduitDetailPage";
import AcheterPage from "@/pages/boutique/AcheterPage";
import CommandeTrackingPage from "@/pages/boutique/CommandeTrackingPage";

// Immobilier
import ImmobilierPage from "@/pages/ImmobilierPage";
import AnnonceDetailPage from "@/pages/AnnonceDetailPage";
import ProfilVendeurPage from "@/pages/ProfilVendeurPage";

// Abonnement & Paiement
import AbonnementPage from "@/pages/AbonnementPage";
import PaymentCallbackPage from "@/pages/PaymentCallbackPage";

// Contacts WhatsApp
import ContactsWhatsAppPage from "@/pages/ContactsWhatsAppPage";

// Admin
import AdminPanelPage from "@/pages/AdminPanelPage";

import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

// ─── Détection app mobile (Capacitor) ─────────────────────────────────────────
// Sur Android/iOS via Capacitor, window.Capacitor existe
const isNativeApp = (): boolean => {
  return typeof (window as any).Capacitor !== "undefined";
};

const LOADER_LOGIN = 800;
const LOADER_PAGE = 800;

// ─── Guards ────────────────────────────────────────────────────────────────────

const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <NexoraAuthGuard>
    <PageLoader duration={LOADER_PAGE}>{children}</PageLoader>
  </NexoraAuthGuard>
);

const AdminPage = ({ children }: { children: React.ReactNode }) => (
  <NexoraAuthGuard requireAdmin>
    <PageLoader duration={LOADER_PAGE}>{children}</PageLoader>
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
      <PageLoader duration={LOADER_PAGE}>
        {isPremium ? children : <PremiumWall />}
      </PageLoader>
    </NexoraAuthGuard>
  );
};

// ─── Application Principale ────────────────────────────────────────────────────

const App = () => {
  // Splash screen uniquement sur l'app native Android/iOS
  const [splashDone, setSplashDone] = useState(!isNativeApp());

  return (
    <QueryClientProvider client={queryClient}>
      <DeviseProvider>
        {/* Splash Nexora affiché au démarrage de l'app mobile */}
        {!splashDone && (
          <NexoraSplash duration={2200} onDone={() => setSplashDone(true)} />
        )}

        <BrowserRouter>
          <TooltipProvider>
            <Toaster />
            <Sonner />

            <Routes>
              {/* 
                Route "/" :
                - Sur le site web → LandingPage
                - Sur l'app mobile → redirige vers /login
              */}
              <Route
                path="/"
                element={
                  isNativeApp()
                    ? <Navigate to="/login" replace />
                    : <LandingPage />
                }
              />

              {/* Public / Auth */}
              <Route
                path="/login"
                element={
                  <PageLoader duration={LOADER_LOGIN}>
                    <NexoraLoginPage />
                  </PageLoader>
                }
              />
              <Route path="/cgu" element={<CGUPage />} />
              <Route path="/confidentialite" element={<PrivacyPage />} />

              {/* PIN Security */}
              <Route path="/setup-pin" element={<SetupPinPage />} />
              <Route path="/unlock-pin" element={<UnlockPinPage />} />

              {/* Dashboard / Finance */}
              <Route path="/dashboard"        element={<ProtectedPage><DashboardPage /></ProtectedPage>} />
              <Route path="/historique"       element={<ProtectedPage><HistoriquePage /></ProtectedPage>} />
              <Route path="/coffre-fort"      element={<AdminPage><CoffreFortPage /></AdminPage>} />
              <Route path="/liens"            element={<AdminPage><LiensPage /></AdminPage>} />
              <Route path="/profil"           element={<ProtectedPage><ProfilPage /></ProtectedPage>} />
              <Route path="/abonnement"       element={<ProtectedPage><AbonnementPage /></ProtectedPage>} />
              <Route path="/transfert"        element={<ProtectedPage><TransfertPage /></ProtectedPage>} />
              <Route path="/factures"         element={<ProtectedPage><FacturesPage /></ProtectedPage>} />
              <Route path="/prets"            element={<AdminPage><PretsPage /></AdminPage>} />
              <Route path="/entrees-depenses" element={<ProtectedPage><EntreesDepensesPage /></ProtectedPage>} />

              {/* Callback Paiement */}
              <Route path="/payment/callback" element={<ProtectedPage><PaymentCallbackPage /></ProtectedPage>} />

              {/* Redirections */}
              <Route path="/entrees"  element={<Navigate to="/entrees-depenses" replace />} />
              <Route path="/depenses" element={<Navigate to="/entrees-depenses" replace />} />

              {/* Premium */}
              <Route path="/contacts-whatsapp"      element={<PremiumPage><ContactsWhatsAppPage /></PremiumPage>} />
              <Route path="/immobilier"             element={<ImmobilierPage />} />
              <Route path="/immobilier/annonce/:id" element={<AnnonceDetailPage />} />
              <Route path="/boutique"               element={<PremiumPage><BoutiqueAccueilPage /></PremiumPage>} />
              <Route path="/boutique/produits"      element={<PremiumPage><BoutiqueProduitsPage /></PremiumPage>} />
              <Route path="/boutique/commandes"     element={<PremiumPage><CommandesPage /></PremiumPage>} />
              <Route path="/boutique/parametres"    element={<PremiumPage><BoutiqueParametresPage /></PremiumPage>} />

              {/* Vitrines publiques */}
              <Route path="/shop/:slug"                    element={<BoutiqueVitrinePage />} />
              <Route path="/shop/:slug/produit/:produitId" element={<ProduitDetailPage />} />
              <Route path="/shop/:slug/acheter/:produitId" element={<AcheterPage />} />
              <Route path="/immobilier/vendeur/:userId"    element={<ProfilVendeurPage />} />
              <Route path="/commande/:commandeId"          element={<CommandeTrackingPage />} />

              {/* Admin */}
              <Route path="/admin"  element={<AdminPage><AdminPanelPage /></AdminPage>} />
              <Route path="/medias" element={<AdminPage><MediasPage /></AdminPage>} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </BrowserRouter>
      </DeviseProvider>
    </QueryClientProvider>
  );
};

export default App;
