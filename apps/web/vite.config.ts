import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'favicon.png', 'apple-touch-icon.png', 'icons/*.png'],
        manifest: {
          name: 'EduConnect',
          short_name: 'EduConnect',
          description: 'School management platform for students, parents, teachers, and admins.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          theme_color: '#7c3aed',
          background_color: '#f8f9fc',
          icons: [
            { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: '/icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        },
      }),
    ],
    build: {
      modulePreload: false,
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              const normalizedId = id.replace(/\\/g, '/');
              if (normalizedId.includes('/recharts/')) {
                return 'charts-vendor';
              }
              if (normalizedId.includes('/motion') || normalizedId.includes('/lucide-react/')) {
                return 'ui-vendor';
              }
              if (normalizedId.includes('/@supabase/')) {
                return 'supabase-vendor';
              }
              if (
                normalizedId.includes('/react/') ||
                normalizedId.includes('/react-dom/') ||
                normalizedId.includes('/react-router/') ||
                normalizedId.includes('/react-router-dom/')
              ) {
                return 'react-vendor';
              }
              return 'vendor';
            }
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@educonnect/shared': path.resolve(__dirname, '../../packages/shared/src'),
        '@educonnect/shared-api': path.resolve(__dirname, '../../packages/shared-api/src'),
        '@educonnect/shared-analytics': path.resolve(
          __dirname,
          '../../packages/shared-analytics/src'
        ),
        '@educonnect/shared-education': path.resolve(
          __dirname,
          '../../packages/shared-education/src'
        ),
        '@educonnect/shared-notifications': path.resolve(
          __dirname,
          '../../packages/shared-notifications/src'
        ),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
