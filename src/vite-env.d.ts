/// <reference types="vite/client" />

// Variable injectée par Vite à chaque build (voir vite.config.ts → define)
// Utilisée dans sw.js pour versionner automatiquement le cache Service Worker
declare const __BUILD_TIME__: string;
