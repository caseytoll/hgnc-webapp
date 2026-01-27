import { defineConfig } from 'vite'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// Plugin to inject build timestamp into service worker and app version
function buildVersionPlugin() {
  return {
    name: 'build-version',
    writeBundle() {
      // Use Melbourne, Australia timezone
      const now = new Date()
      const melbourneTime = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' }))
      const year = melbourneTime.getFullYear()
      const month = String(melbourneTime.getMonth() + 1).padStart(2, '0')
      const day = String(melbourneTime.getDate()).padStart(2, '0')
      const hour = String(melbourneTime.getHours()).padStart(2, '0')
      const minute = String(melbourneTime.getMinutes()).padStart(2, '0')

      const buildTime = `${year}${month}${day}${hour}${minute}`
      const appVersion = `${year}-${month}-${day}`

      // Update service worker
      const swPath = resolve('dist/sw.js')
      try {
        let content = readFileSync(swPath, 'utf-8')
        content = content.replace('__BUILD_TIME__', buildTime)
        writeFileSync(swPath, content)
        console.log(`[Build] SW version: ${buildTime}`)
      } catch (e) {
        console.error('[Build] Failed to update SW version:', e.message)
      }

      // Update index.html app version
      const htmlPath = resolve('dist/index.html')
      try {
        let content = readFileSync(htmlPath, 'utf-8')
        content = content.replace('__APP_VERSION__', appVersion)
        writeFileSync(htmlPath, content)
        console.log(`[Build] App version: ${appVersion}`)
      } catch (e) {
        console.error('[Build] Failed to update app version:', e.message)
      }
    }
  }
}

export default defineConfig({
  root: '.',
  server: {
    port: 3000,
    open: true,
    // Proxy API calls to bypass CORS during local development
    proxy: {
      '/gas-proxy': {
        // Updated to latest deployed Apps Script web app (deployment @55)
        target: 'https://script.google.com/macros/s/AKfycbzDYbesIxbGVQ3NtQorZ5eO8muR16js5VEogZanlt54rWGCgTJ0kF2GhxBluoKqearN/exec',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gas-proxy/, ''),
        followRedirects: true
      }
    }
  },
  build: {
    outDir: 'dist'
  },
  plugins: [buildVersionPlugin()]
})
