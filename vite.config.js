import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  server: {
    port: 3000,
    open: true,
    // Proxy API calls to bypass CORS during local development
    proxy: {
      '/gas-proxy': {
        target: 'https://script.google.com/macros/s/AKfycbyBxhOJDfNBZuZ65St-Qt3UmmeAD57M0Jr1Q0MsoKGbHFxzu8rIvarJOOnB4sLeJZ-V/exec',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gas-proxy/, ''),
        followRedirects: true
      }
    }
  },
  build: {
    outDir: 'dist'
  }
})
