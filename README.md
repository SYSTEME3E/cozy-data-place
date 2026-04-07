# 🚀 Nexora PWA — Guide d'intégration

## 📁 Fichiers fournis

```
pwa/
├── public/
│   ├── manifest.json       ← Manifeste PWA
│   └── sw.js               ← Service Worker
├── src/components/
│   └── InstallPWA.tsx      ← Bouton d'installation React
└── index.html              ← index.html mis à jour (remplace le tien)
```

---

## ✅ Étape 1 — Copier les fichiers

```bash
# Depuis la racine de ton projet cozy-data-place-main

cp pwa/public/manifest.json   public/manifest.json
cp pwa/public/sw.js           public/sw.js
cp pwa/src/components/InstallPWA.tsx  src/components/InstallPWA.tsx
```

Remplace ton `index.html` par le nouveau fourni **ou** ajoute uniquement
les balises PWA entre les commentaires `── PWA Meta Tags ──`.

---

## ✅ Étape 2 — Ajouter le composant dans l'app

Ouvre `src/App.tsx` (ou `src/components/AppLayout.tsx`) et importe le composant :

```tsx
import InstallPWA from "@/components/InstallPWA";

// Dans le JSX racine, juste avant </BrowserRouter> (ou à la fin du return)
<InstallPWA />
```

**Exemple dans App.tsx :**
```tsx
return (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      {/* ... tes routes ... */}
      <InstallPWA />   {/* ← ajoute cette ligne */}
    </BrowserRouter>
  </QueryClientProvider>
);
```

---

## ✅ Étape 3 — Vérifier avec Lighthouse

1. `npm run build && npm run preview`
2. Ouvre Chrome DevTools → onglet **Lighthouse**
3. Coche **Progressive Web App** → Générer le rapport
4. Tous les critères PWA doivent être verts ✅

---

## ⚠️ Points importants

### Icônes
Le manifest pointe vers l'URL PostImg de ton logo. Pour la production,
**télécharge l'image** et place des versions aux tailles exactes dans `/public/icons/` :

```
public/icons/icon-192x192.png
public/icons/icon-512x512.png
public/icons/icon-maskable-192x192.png  ← fond plein (pour Android)
```

Puis mets à jour `manifest.json` :
```json
{ "src": "/icons/icon-192x192.png", "sizes": "192x192", ... }
```

### Service Worker & Vite
Le SW est en vanilla JS (compatible Vite sans plugin). Si tu veux
une solution plus robuste avec précaching automatique des assets Vite,
installe **vite-plugin-pwa** :

```bash
npm install -D vite-plugin-pwa
```

```ts
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: { /* contenu de ton manifest.json */ }
    })
  ]
})
```

### HTTPS obligatoire
Les Service Workers ne fonctionnent **qu'en HTTPS** (ou localhost).
Vercel déploie en HTTPS par défaut ✅.

---

## 🧪 Tester l'installation

- **Android Chrome** : ouvre l'app → le bouton « Installer l'application Nexora » apparaît automatiquement en bas de l'écran
- **iOS Safari** : une bannière d'aide s'affiche avec les étapes détaillées
- **Chrome Desktop** : l'icône d'installation apparaît dans la barre d'adresse
