import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import { localMusic } from './build/localMusic'

// Public assets keep their original URLs. Discover them at build time and on dev reload.
function publicImages(name: string, folder: string, pattern: RegExp): Plugin {
  const id = `\0virtual:${name}-images`
  let directory = ''
  return {
    name: `${name}-images`,
    configResolved(config) {
      directory = resolve(config.publicDir, folder)
    },
    resolveId(source) {
      if (source === `virtual:${name}-images`) return id
    },
    load(source) {
      if (source !== id) return
      const files = readdirSync(directory)
        .filter((file) => pattern.test(file))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      return `export default ${JSON.stringify(files.map((file) => `/${folder}/${encodeURIComponent(file)}`))}`
    },
    configureServer(server) {
      const reload = (file: string) => {
        if (
          !file.replaceAll('\\', '/').startsWith(directory.replaceAll('\\', '/') + '/') ||
          !pattern.test(file.split(/[\\/]/).pop() || '')
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
  plugins: [
    react(),
    publicImages('home', 'images', /^home\d*\.(jpe?g|png|webp|avif)$/i),
    publicImages('user', 'images/user', /\.(jpe?g|png|webp|avif|gif)$/i),
    localMusic(),
  ],
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
