import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import { localMusic } from './build/localMusic'

// Public assets keep their original URLs. Discover them at build time and on dev reload.
function homeImages(): Plugin {
  const id = '\0virtual:home-images'
  let directory = ''
  return {
    name: 'home-images',
    configResolved(config) {
      directory = resolve(config.publicDir, 'images')
    },
    resolveId(source) {
      if (source === 'virtual:home-images') return id
    },
    load(source) {
      if (source !== id) return
      const files = readdirSync(directory)
        .filter((file) => /^home\d*\.(jpe?g|png|webp|avif)$/i.test(file))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      return `export default ${JSON.stringify(files.map((file) => `/images/${file}`))}`
    },
    configureServer(server) {
      const reload = (file: string) => {
        if (
          !file.replaceAll('\\', '/').startsWith(directory.replaceAll('\\', '/') + '/') ||
          !/^home\d*\.(jpe?g|png|webp|avif)$/i.test(file.split(/[\\/]/).pop() || '')
        )
          return
        const module = server.moduleGraph.getModuleById(id)
        if (module) server.moduleGraph.invalidateModule(module)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('add', reload).on('unlink', reload)
    },
  }
}

export default defineConfig({
  plugins: [react(), homeImages(), localMusic()],
  server: {
    port: 5173,
    // Wait for new/updated source files to finish writing before transforming them.
    watch: { awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 25 } },
    proxy: Object.fromEntries(
      ['/api', '/rss.xml', '/sitemap.xml'].map((path) => [
        path,
        { target: process.env.API_PROXY_TARGET || 'http://127.0.0.1:8080', changeOrigin: true },
      ]),
    ),
  },
})
