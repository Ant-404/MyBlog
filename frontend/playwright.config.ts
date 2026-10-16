import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:5174',
    viewport: { width: 1440, height: 1100 },
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chromium',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node tests/fixtures/music-server.mjs',
      url: 'http://127.0.0.1:8091/health',
      reuseExistingServer: false,
    },
    {
      command:
        'mvn spring-boot:test-run -Dspring-boot.run.profiles=test -Dspring-boot.run.arguments=--server.port=8081',
      cwd: '../backend',
      env: {
        METING_API_URL: 'http://127.0.0.1:8091/meting',
      },
      url: 'http://127.0.0.1:8081/api/v1/site/stats',
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev -- --port 5174 --strictPort',
      url: 'http://127.0.0.1:5174',
      env: { API_PROXY_TARGET: 'http://127.0.0.1:8081', VITE_DEMO_MODE: 'false' },
      reuseExistingServer: !process.env.CI,
    },
  ],
})
