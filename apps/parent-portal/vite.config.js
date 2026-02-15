import { defineConfig } from 'vite';
import { createViteConfig } from '../../common/build/vite.config.shared.js';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Parent portal config - no service worker (always fetch fresh data)
const shared = createViteConfig({ port: 3001 });

export default defineConfig({
  ...shared,
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
