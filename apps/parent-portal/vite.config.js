import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Parent portal config - no service worker (always fetch fresh data)
export default defineConfig({
  root: '.',
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 3001
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'public/manifest.json', dest: '.' },
        { src: 'public/_headers', dest: '.' }
        // No sw.js - parent portal should always fetch fresh data
      ]
    })
  ]
});
