import { createHash } from 'node:crypto'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

const audioPattern = /\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)$/i
const coverExtensions = ['jpg', 'jpeg', 'png', 'webp', 'avif']

export function localMusic(): Plugin {
  const id = '\0virtual:local-music'
  let directory = ''
  return {
    name: 'local-music',
    configResolved(config) {
      directory = resolve(config.publicDir, 'music')
    },
    resolveId(source) {
      if (source === 'virtual:local-music') return id
    },
    load(source) {
      if (source !== id) return
      const files = readdirSync(directory, { withFileTypes: true })
        .filter((file) => file.isFile())
        .map((file) => file.name)
        .sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }))
      const url = (file: string) => `/music/${encodeURIComponent(file)}`
      const tracks = files
        .filter((file) => audioPattern.test(file))
        .map((file) => {
          const name = file.replace(audioPattern, '')
          const separator = name.indexOf(' - ')
          const cover = [name, 'cover']
            .flatMap((base) => coverExtensions.map((extension) => `${base}.${extension}`))
            .map((candidate) =>
              files.find((item) => item.toLowerCase() === candidate.toLowerCase()),
            )
            .find(Boolean)
          return {
            id: Number.parseInt(createHash('sha256').update(file).digest('hex').slice(0, 12), 16),
            title: separator > 0 ? name.slice(separator + 3).trim() || name : name,
            artist: separator > 0 ? name.slice(0, separator).trim() : '',
            audioUrl: url(file),
            cover: cover ? url(cover) : '',
          }
        })
      return `export default ${JSON.stringify(tracks)}`
    },
    configureServer(server) {
      const reload = (file: string) => {
        const normalized = file.replaceAll('\\', '/')
        if (!normalized.startsWith(directory.replaceAll('\\', '/') + '/')) return
        if (!/\.(mp3|wav|ogg|m4a|aac|flac|opus|webm|jpe?g|png|webp|avif)$/i.test(file)) return
        const module = server.moduleGraph.getModuleById(id)
        if (module) server.moduleGraph.invalidateModule(module)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.add(directory)
      server.watcher.on('add', reload).on('unlink', reload).on('change', reload)
    },
  }
}
