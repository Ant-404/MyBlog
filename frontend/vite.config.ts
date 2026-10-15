import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
