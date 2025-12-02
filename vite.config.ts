import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Meu DinDin',
          short_name: 'Meu DinDin',
          start_url: '/',
          display: 'standalone',
          background_color: '#020617',
          theme_color: '#020617',
          icons: [
            {
              src: 'icons/meu_dindin_logo_mascote_192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icons/meu_dindin_logo_mascote_512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
        includeAssets: ['icons/meu_dindin_logo_mascote_192x192.png', 'icons/meu_dindin_logo_mascote_512x512.png'],
      }),
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
