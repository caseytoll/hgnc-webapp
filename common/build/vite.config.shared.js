import { viteStaticCopy } from 'vite-plugin-static-copy';

export function createViteConfig(options = {}) {
  const { port = 3000 } = options;
  
  return {
    root: '.',
    base: '/', // Use absolute paths for assets (required for SPA routing)
    build: {
      outDir: 'dist', // Output to dist from current directory
      emptyOutDir: true
    },
    server: {
      port
    },
    plugins: [
      viteStaticCopy({
        targets: [
          { src: 'public/manifest.json', dest: '.' },
          { src: 'public/sw.js', dest: '.' }
        ]
      })
    ]
  };
}
