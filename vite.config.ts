import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// 1. Tailwind CSS v4 Plugin එක Import කිරීම (වැදගත්ම කොටස)
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // Env variables load කරගැනීම
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // GitHub Pages හෝ Deploy කරන තැනට අදාළ Base URL එක
    base: '/FMJ/',

    server: {
      port: 3000,
      host: '0.0.0.0',
      // 2. Cloud Environment එකේ WebSocket දෝෂ මගහරවා ගැනීමට (වැදගත්)
      hmr: {
        clientPort: 443,
      },
      allowedHosts: true,
    },

    plugins: [

      react(),
      nodePolyfills({
        // xlsx-populate සඳහා අවශ්‍ය වන මූලික කොටස් අනිවාර්ය කිරීම
        include: ['buffer', 'stream', 'crypto', 'util', 'events', 'path'],
        globals: {
          Buffer: true, 
          global: true,
          process: true,
        },
      }),

      // 3. Tailwind Plugin එක මෙතනට එකතු කිරීම
      tailwindcss(),
    ],

    define: {
      // Env variables global ලෙස define කිරීම
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      global: 'window', // 🟢 මේ පේළිය අලුතින් එක් කරන්න
    },

    resolve: {
      alias: {
        // '@' ලකුණෙන් src ෆෝල්ඩරයට කෙලින්ම යොමු වීමට
        '@': path.resolve(__dirname, './src'),
      }
    },

    build: {
      outDir: 'dist',
    }
  };
});