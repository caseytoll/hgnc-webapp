export default defineConfig({
  root: 'apps/coach-app',
  server: {
    port: 3000,
    open: true,
    configureServer(server) {
      // No custom middleware needed - using separate proxy server
    },
    fs: {
      // Allow serving files from one level up to to the project root
      allow: ['..']
    },
    historyApiFallback: false
  },
  build: {
    outDir: 'dist'
  },
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
  },
  plugins: [buildVersionPlugin()]
})
