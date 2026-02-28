import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import solidJs from '@astrojs/solid-js';

export default defineConfig({
  integrations: [solidJs()],
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            echarts: ['echarts'],
            stats: ['simple-statistics'],
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
