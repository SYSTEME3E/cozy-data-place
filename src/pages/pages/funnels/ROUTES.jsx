// ─────────────────────────────────────────────────────────
//  NEXORA PAGES — Routes React Router
//  À intégrer dans votre App.jsx / router principal
// ─────────────────────────────────────────────────────────

import { Routes, Route } from "react-router-dom";

// Pages principales
import FunnelDashboard    from "./funnels/dashboard";
import FunnelCreate       from "./funnels/create";
import FunnelEditor       from "./funnels/editor";
import FunnelPreview      from "./funnels/preview";
import FunnelSettings     from "./funnels/settings";
import FunnelAnalytics    from "./funnels/analytics";

// Steps du tunnel
import StepLanding        from "./funnels/steps/landing";
import StepCheckout       from "./funnels/steps/checkout";
import StepThankYou       from "./funnels/steps/thankyou";

// Popups
import PopupEditor        from "./funnels/popups/popup-editor";

// Produits
import ProductList        from "./funnels/products/product-list";
import ProductCreate      from "./funnels/products/product-create";

export default function FunnelRoutes() {
  return (
    <Routes>
      {/* Dashboard */}
      <Route path="/funnels"                      element={<FunnelDashboard />} />

      {/* Créer un tunnel */}
      <Route path="/funnels/create"               element={<FunnelCreate />} />

      {/* Éditeur (builder drag & drop) */}
      <Route path="/funnels/editor/:id"           element={<FunnelEditor />} />

      {/* Aperçu visiteur */}
      <Route path="/funnels/preview/:id"          element={<FunnelPreview />} />

      {/* Paramètres page */}
      <Route path="/funnels/settings/:id"         element={<FunnelSettings />} />

      {/* Analytics */}
      <Route path="/funnels/analytics/:id"        element={<FunnelAnalytics />} />

      {/* Steps du tunnel */}
      <Route path="/funnels/steps/landing"        element={<StepLanding />} />
      <Route path="/funnels/steps/checkout"       element={<StepCheckout />} />
      <Route path="/funnels/steps/thankyou"       element={<StepThankYou />} />

      {/* Popup builder */}
      <Route path="/funnels/popups/editor"        element={<PopupEditor />} />
      <Route path="/funnels/popups/editor/:id"    element={<PopupEditor />} />

      {/* Produits */}
      <Route path="/funnels/products"             element={<ProductList />} />
      <Route path="/funnels/products/create"      element={<ProductCreate />} />
      <Route path="/funnels/products/edit/:id"    element={<ProductCreate />} />
    </Routes>
  );
}

// ─────────────────────────────────────────────────────────
//  STRUCTURE DES FICHIERS
// ─────────────────────────────────────────────────────────
//
//  /pages/funnels/
//  │
//  ├── dashboard.jsx          ← Liste tous les tunnels
//  ├── create.jsx             ← Créer un nouveau tunnel
//  ├── editor.jsx             ← Builder drag & drop (LE cœur)
//  ├── preview.jsx            ← Aperçu comme visiteur
//  ├── settings.jsx           ← Paramètres (SEO, URL, tracking)
//  ├── analytics.jsx          ← Stats & conversions
//  │
//  ├── steps/
//  │   ├── landing.jsx        ← Page d'atterrissage
//  │   ├── checkout.jsx       ← Page de paiement (MTN, Moov...)
//  │   └── thankyou.jsx       ← Confirmation après paiement
//  │
//  ├── popups/
//  │   └── popup-editor.jsx   ← Éditeur de popups
//  │
//  └── products/
//      ├── product-list.jsx   ← Liste des produits
//      └── product-create.jsx ← Créer / modifier un produit
//
// ─────────────────────────────────────────────────────────
