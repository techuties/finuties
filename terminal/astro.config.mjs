import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import solidJs from '@astrojs/solid-js';

const FINUTIES_API_TARGET = (process.env.FINUTIES_DEV_PROXY_TARGET || 'https://data.finuties.com').replace(/\/+$/, '');

export default defineConfig({
  integrations: [solidJs()],
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        '/api': { target: FINUTIES_API_TARGET, changeOrigin: true, secure: true },
        '/health': { target: FINUTIES_API_TARGET, changeOrigin: true, secure: true },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/echarts')) return 'echarts';
            if (id.includes('node_modules/simple-statistics')) return 'stats';
          },
        },
      },
      chunkSizeWarningLimit: 600,
      minify: 'esbuild',
      sourcemap: process.env.NODE_ENV === 'development',
    },
    optimizeDeps: {
      include: ['echarts', 'simple-statistics'],
    },
  },
  site: 'https://terminal.finuties.com',
  output: 'static',
  build: {
    assets: '_assets',
    inlineStylesheets: 'auto',
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'viewport',
  },
});
