import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Servi sur https://<user>.github.io/carnet-recettes/ — la base doit correspondre au nom du dépôt
  base: '/carnet-recettes/',
  build: { target: 'es2020' },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'favicon.svg', 'favicon.png'],
      manifest: {
        name: 'Mon Carnet de Recettes',
        short_name: 'Carnet',
        description: 'Carnet de recettes personnel — pains artisanaux & cuisine du monde',
        lang: 'fr',
        start_url: '/carnet-recettes/',
        scope: '/carnet-recettes/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0A0A0B',
        theme_color: '#0A0A0B',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Vignettes TheMealDB et photos externes : cache-first
            urlPattern: /^https:\/\/(www\.)?themealdb\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mealdb-images',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 90 }
            }
          }
        ]
      }
    })
  ]
});
