import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative base so the build works from any folder (GitHub Pages project sites, Netlify, etc.)
  base: './',
  server: { host: true, port: 5173 },
  build: { chunkSizeWarningLimit: 2000, target: 'es2020' },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Plunk! Water Toy Games',
        short_name: 'Plunk!',
        description:
          'The water toy you remember: ring toss and basketball, with a color-matching score twist.',
        theme_color: '#1b8fd1',
        background_color: '#0e2a47',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,json,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
});
