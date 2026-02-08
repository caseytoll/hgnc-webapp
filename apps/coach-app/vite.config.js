import { defineConfig } from 'vite';
import { createViteConfig } from '../../common/build/vite.config.shared.js';
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// Calculate app version for build
// Increment revision letter (a, b, c...) for multiple deploys on the same day
const REVISION = 'i'

const now = new Date()
const melbourneTime = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' }))
const year = melbourneTime.getFullYear()
const month = String(melbourneTime.getMonth() + 1).padStart(2, '0')
const day = String(melbourneTime.getDate()).padStart(2, '0')
const appVersion = `${year}-${month}-${day}${REVISION}`

// Plugin to inject build timestamp into service worker and app version
function buildVersionPlugin() {
  return {
    name: 'build-version',
    transformIndexHtml(html) {
      console.log(`[Build] Transforming HTML, replacing __APP_VERSION__ with ${appVersion}`)
      return html.replace('__APP_VERSION__', appVersion)
    },
    writeBundle() {
      const hour = String(melbourneTime.getHours()).padStart(2, '0')
      const minute = String(melbourneTime.getMinutes()).padStart(2, '0')

      const buildTime = `${year}${month}${day}${hour}${minute}`

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
    }
  }
}

export default defineConfig({
  ...createViteConfig({ port: 3000 }),
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
  },
  plugins: [
    ...createViteConfig({ port: 3000 }).plugins,
    buildVersionPlugin()
  ]
});
