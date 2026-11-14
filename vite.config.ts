import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Der Repo-Name ist zugleich der Pfad auf GitHub Pages
// (https://<user>.github.io/mc-farmatlas/). Service-Worker-Scope und
// Manifest müssen denselben Pfad verwenden.
const BASE = '/mc-farmatlas/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt': Die neue Version wird erst nach Bestätigung aktiv
      // (Hinweis in src/app/UpdatePrompt.tsx).
      registerType: 'prompt',
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Farmatlas',
        short_name: 'Farmatlas',
        description: 'Minecraft-Farmen nachschlagen und Ebene für Ebene nachbauen',
        lang: 'de',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'any',
        background_color: '#12161a',
        theme_color: '#12161a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Alles vorab cachen – auch die Farmdaten, die als JS-Chunks
        // ausgeliefert werden. So funktioniert die App komplett offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,wasm}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  // Die Schematic-Bibliothek bringt WebAssembly mit; vorgebündelt lädt sie es im
  // Entwicklungsserver nicht und fällt still auf langsames JavaScript zurück.
  optimizeDeps: { exclude: ['minecraft-block-reader'] },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
